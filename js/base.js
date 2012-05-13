var hasTouch              = Modernizr.touch,
	hasMotion             = Modernizr.devicemotion,
	hasOrientation        = Modernizr.deviceorientation,
	has3d                 = Modernizr.csstransforms3d,
	foldingEvent          = 'pageFolding',
	rotationEvent         = (hasTouch && hasOrientation) ? 'deviceorientation' : 'mousemove',
	dragStartEvent        = hasTouch ? 'touchstart' : 'mousedown',
	dragMoveEvent         = hasTouch ? 'touchmove' : 'mousemove',
	dragStopEvent         = hasTouch ? 'touchend' : 'mouseup',
	selectionEvent        = hasTouch ? 'touchend' : 'click',
	domTransformProperty  = Modernizr.prefixed('transform'),
	cssTransformProperty  = domToCss(domTransformProperty),
	domTransitionProperty = Modernizr.prefixed('transition'),
	cssTransitionProperty = domToCss(domTransitionProperty),
	transitionEndEvent    = {
		'WebkitTransition' : 'webkitTransitionEnd',
		'MozTransition'    : 'transitionend',
		'OTransition'      : 'oTransitionEnd',
		'msTransition'     : 'MSTransitionEnd',
		'transition'       : 'transitionend'
	}[ domTransitionProperty ],
	PAGE_TURN_SPEED       = 25,
	zoomedIn              = false,
	curPageIndex          = 0,
	curSceneScale         = 1,
	curRotX               = -15,
	curRotY               = 0,
	curPer                = 0,
	adjustedPer           = 0,
	numTouches            = 0,
	bgColors              = ['#3272ad', '#ae0039', '#50326d', '#355506', '#3272ad'],
	$document             = $(document),
	$window               = $(window),
	$body,
	$scene,
	$book,
	$spreads,
	$leftPage,
	$rightPage,
	$dragNotice,
	$hotSpots
;








/****************************

	Main

****************************/

$document.ready(function () {

	$body       = $('body');
	$scene      = $('.scene');
	$book       = $('.book');
	$spreads    = $('.spread');
	$dragNotice = $('.drag-notice');
	$hotSpots   = $('.hotspot');

	if (has3d) {
		craftThatPaperBaby();
		if (hasTouch) {
			hideLocationBar();
			$dragNotice.html('Touch and drag<br />to turn pages!');
			$dragNotice.css({
				'width': '220px'
			});
		}

		$window.bind(rotationEvent, rotateScene);
		$window.bind('resize', resizeScene);
		$body.bind(dragStartEvent, startDrag);
		$body.on(selectionEvent, $hotSpots.selector, zoomToHotspot);
		// Sometimes, when zoomed in, the click target is `body`; not a hotspot
		$body.on(selectionEvent, function (e) {
			if (zoomedIn && e.target == e.currentTarget) {
				zoomToHotspot(e);
			}
		});

		resizeScene();
		adjustScene();
	} else {
		$body.addClass('no3d');
	}
});






/****************************

	Pages

****************************/

function startDrag(e) {
	if (zoomedIn) return;
	e.preventDefault();
	$book.css('cursor', '-webkit-grabbing');
	var data = {
		offset: hasTouch ? e.originalEvent.touches[0].pageX : e.pageX,
		width: $body.width()
	};

	$body.bind(dragMoveEvent, data, updateDrag);
	$body.bind(dragStopEvent, stopDrag);
}

function updateDrag(e) {
	e.preventDefault();

	$dragNotice.removeClass('shown');

	var offset      = e.data.offset;
	var width       = e.data.width;
	var targetX     = hasTouch ? e.originalEvent.touches[0].pageX : e.pageX - offset;
	var per         = clamp(targetX / width * 2.5, -1, 1);
	var shouldBreak = false;
	var dir         = per < 0 ? 'left' : 'right';

	if (curPer + per < 0 && adjustedPer > 0) {
		shouldBreak = true;
		curPer      = adjustedPer = 0;
		stopDrag();
	} else if (curPer + per > 0 && adjustedPer < 0) {
		shouldBreak = true;
		curPer      = adjustedPer = 0;
		stopDrag();
	} else {
		adjustedPer = clamp(curPer + per, -1, 1);
		adjustedPer = Math.round(adjustedPer * 1000) / 1000;
	}

	var absPer = Math.abs(adjustedPer);

	if ((curPageIndex == 0 && adjustedPer > 0) || (curPageIndex == 4 && adjustedPer < 0)) {
		stopDrag();
		curPer = adjustedPer = 0;
		return;
	}

	if (absPer != 1 && absPer != 0) {
		$hotSpots.css('pointer-events', 'none');
		$hotSpots.find('.indicator').css('opacity', '0');
	} else {
		$hotSpots.css('pointer-events', 'auto');
		$hotSpots.find('.indicator').css('opacity', '1');
	}

	var leftTransform;
	var rightTransform;
	if (!shouldBreak) {
		$leftPage      = adjustedPer < 0 ? $spreads.eq( curPageIndex ) : $spreads.eq( curPageIndex - 1 );
		$rightPage     = adjustedPer < 0 ? $spreads.eq(curPageIndex + 1) : $spreads.eq(curPageIndex);
		rightTransform = 'rotateY(' + (-180 * (adjustedPer < 0 ? absPer : 1 - absPer)) + 'deg)';
		leftTransform  = 'rotateY(' + (180 * (adjustedPer < 0 ? 1 - absPer : absPer)) + 'deg)';
		$leftPage.find('.page-right').css(cssTransformProperty, rightTransform);
		$rightPage.find('.page-left').css(cssTransformProperty, leftTransform);

		$leftPage.trigger(foldingEvent, adjustedPer < 0 ? absPer : 1 - absPer);
		$rightPage.trigger(foldingEvent, adjustedPer < 0 ? 1 - absPer : absPer);

		toggleVisibles(absPer * 180, adjustedPer < 0 ? curPageIndex : curPageIndex - 1);
	} else {
		rightTransform = 'rotateY(' + (-180 * (dir == 'right' ? absPer : 1 - absPer)) + 'deg)';
		leftTransform  = 'rotateY(' + (180 * (dir == 'right' ? 1 - absPer : absPer)) + 'deg)';
		$leftPage.find('.page-right').css(cssTransformProperty, rightTransform);
		$rightPage.find('.page-left').css(cssTransformProperty, leftTransform);

		$leftPage.trigger(foldingEvent, dir == 'right' ? absPer : 1 - absPer);
		$rightPage.trigger(foldingEvent, dir == 'right' ? 1 - absPer : absPer);

		toggleVisibles(absPer * 180, dir == 'right' ? curPageIndex : curPageIndex - 1);
	}

	$spreads.each(function (i) {
		var anglePerPage = 180 / 9;
		var offsetIndex  = adjustedPer < 0 ? 5 + curPageIndex - i : 5 + curPageIndex - i - 2;
		var offsetAngle  = adjustedPer < 0 ? offsetIndex - adjustedPer - 1 : offsetIndex - adjustedPer + 1;
		var rads         = degToRad(offsetAngle * anglePerPage + 10);
		var tarX         = 5 * Math.cos(rads);
		var tarZ         = 5 * Math.sin(rads);
		var transform    = 'translateX(' + tarX.toFixed(3) + 'px) translateZ(' + tarZ.toFixed(3) + 'px) rotateY(' + (i * 0.5) + 'deg)';
		$(this).css(cssTransformProperty, transform);
	});

	var rotateTransform;
	var translateTransform;
	if (curPageIndex == 0) {
		rotateTransform = 'rotateX(' + (29 + (61 * absPer)) + 'deg) rotateZ(' + (-8 + (8 * absPer)) + 'deg)';
		translateTransform = 'translate3d(' + (-300 + (300 * absPer)) + 'px, 0, ' + (100 - (100 * absPer)) + 'px)';
	} else if (curPageIndex == 1 && adjustedPer > 0) {
		rotateTransform = 'rotateX(' + (90 - (61 * absPer)) + 'deg) rotateZ(' + (-8 * absPer) + 'deg)';
		translateTransform = 'translate3d(' + (-300 * absPer) + 'px, 0, ' + (100 * absPer) + 'px)';
	} else if (curPageIndex == 3 && adjustedPer < 0) {
		rotateTransform = 'rotateX(' + (90 - (61 * absPer)) + 'deg) rotateZ(' + (-8 * absPer) + 'deg)';
		translateTransform = 'translate3d(' + (300 * absPer) + 'px, ' + (-120 * absPer) + 'px, ' + (100 * absPer) + 'px)';
	} else if (curPageIndex == 4) {
		rotateTransform = 'rotateX(' + (29 + (61 * adjustedPer)) + 'deg) rotateZ(' + (-8 + (8 * adjustedPer)) + 'deg)';
		translateTransform = 'translate3d(' + (300 - (300 * adjustedPer)) + 'px, ' + (-120 + (120 * adjustedPer)) + 'px, ' + (100 - (100 * adjustedPer)) + 'px)';
	}

	if (translateTransform && rotateTransform) {
		var bookTransform = translateTransform + ' ' + rotateTransform;
		$book.css(cssTransformProperty, bookTransform);
	}

	if (absPer >= 1) {
		adjustedPer < 0 ? curPageIndex++ : curPageIndex--;
		curPer = adjustedPer = 0;
		stopDrag();
	}
}

function stopDrag(e) {
	curDir = null;
	curPer = adjustedPer;
	$body.unbind(dragMoveEvent, updateDrag);
	$body.unbind(dragStopEvent, stopDrag);
	$book.css('cursor', '-webkit-grab');
}

function toggleVisibles(per, leftIndex) {
	var curPage  = $spreads.eq( curPageIndex );
	var nextPage = $spreads.eq(curPageIndex + 1);
	var prevPage = $spreads.eq(curPageIndex - 1);

	var toTurn1;
	var toTurn2;

	if (leftIndex == curPageIndex) {
		toTurn1 = curPage;
		toTurn2 = nextPage;
	} else {
		toTurn1 = curPage;
		toTurn2 = prevPage;
	}

	if (per > 179.5) {
		toTurn1.find('.popup').hide();
		toTurn1.find('.hotspot').hide();
	} else {
		toTurn1.find('.popup').show();
		toTurn1.find('.hotspot').show();
	}

	if (per < 0.5) {
		toTurn2.find('.popup').hide();
		toTurn2.find('.hotspot').hide();
	} else {
		toTurn2.find('.popup').show();
		toTurn2.find('.hotspot').show();
	}

	if (per > 160) {
		toTurn1.find('.hotspot .indicator').hide();
	} else {
		toTurn1.find('.hotspot .indicator').show();
	}

	if (per < 20) {
		toTurn2.find('.hotspot .indicator').hide();
	} else {
		toTurn2.find('.hotspot .indicator').show();
	}
}








/****************************

	Hotspots

****************************/

function onTransitionEnd() {
	$scene.css(cssTransitionProperty, 'none');
}

function zoomToHotspot(e) {

	e.preventDefault();

	var $spot        = $(this);
	var $focusedSpot = $hotSpots.filter('.focused');
	var hotspot      = $focusedSpot.length > 0 ? $focusedSpot : $spot;
	var indicator    = hotspot.children('.indicator');

	if (zoomedIn) {

		hotspot.removeClass('focused');
		$spreads.show();
		adjustScene();

		$scene.bind(transitionEndEvent, onTransitionEnd);
	} else {
		hotspot.addClass('focused');
		var thisSpread = hotspot.parents('.spread');
		$spreads.not(thisSpread).hide();
		indicator.css({
			'margin-left': indicator.attr('data-offsetX') + 'px',
			'margin-top': indicator.attr('data-offsetY') + 'px'
		});

		$scene.unbind(transitionEndEvent, onTransitionEnd);

		$scene.css(cssTransitionProperty, 'all .6s');

		var $spread         = $spot.parents('.spread');
		var scale           = (1 - ((1 - curSceneScale) * 0.3));
		var scaleTransform  = 'scale3d(' + scale + ', ' + scale + ', ' + scale + ')';
		var rotateTransform = 'rotateX(-90deg) rotateY(5deg) rotateZ(1deg)';

		var translateTransform;
		if ($spread.hasClass('intro')) {
			translateTransform = 'translate3d(400px, -200px, 400px)';
		} else if ($spread.hasClass('location')) {
			translateTransform = 'translate3d(-330px, -150px, 400px)';
		} else if ($spread.hasClass('music')) {
			translateTransform = 'translate3d(315px, -200px, 400px)';
		}

		var spreadTransform = [scaleTransform, translateTransform, rotateTransform].join(' ');
		$scene.css(cssTransformProperty, spreadTransform);
	}

	zoomedIn = !zoomedIn;
}










/****************************

	Scenes

****************************/


function rotateScene(e) {
	if (zoomedIn) return;
	var o     = e.originalEvent;
	var theta = (Math.abs(window.orientation) == 90) ? o.beta : o.gamma;
	curRotY   = e.type === 'deviceorientation' ? 0 + (15 * (theta / -45)) : -15 + (30 * e.pageX / $body.width());
	curRotX   = -15;

	adjustScene();
}

function adjustScene() {
	var scaleTransform     = 'scale3d(' + curSceneScale + ', ' + curSceneScale + ', ' + curSceneScale + ')';
	var rotateTransform    = 'rotateX(' + curRotX + 'deg) rotateY(' + curRotY + 'deg)';
	var translateTransform = 'translateY(100px)';
	var sceneTransform     =  [scaleTransform, rotateTransform, translateTransform].join(' ');

	$scene.css(cssTransformProperty, sceneTransform);
}

function resizeScene(e) {
	hideLocationBar();
	var curW = $body.width();
	var curH = $body.height();
	var maxW = 1670;
	var maxH = 725;

	var diffW = curW / maxW;
	var diffH = curH / maxH;

	curSceneScale = diffW < diffH ? diffW : diffH;

	adjustScene();
}










/****************************

	Utilities

****************************/

function degToRad(deg) {
	return deg * Math.PI / 180;
}

function radToDeg(rad) {
	return rad * 180 / Math.PI;
}

function domToCss(property) {

	var css = property.replace(/([A-Z])/g, function (str, m1) {
		return '-' + m1.toLowerCase();
	}).replace(/^ms-/,'-ms-');

	return css;
}

function clamp( val, min, max ){

	if (val > max) return max;
	if (val < min) return min;

	return val;
}





/****************************

	Setup

****************************/


function craftThatPaperBaby() {
	$('.popup').each(function (i) {
		var $popup = $(this);
		var master = $popup.parents('.spread');
		var depth  = $popup.attr('data-depth');
		var popup  = new Popup($popup, depth, foldingEvent);
	});

	$spreads.each(function (i) {
		var anglePerPage  = 180 / 9;
		var offsetIndex   = 5 + curPageIndex - i;
		var offsetAngle   = offsetIndex - 1;
		var rads          = degToRad(offsetAngle * anglePerPage + 10);
		var tarX          = 5 * Math.cos(rads);
		var tarZ          = 5 * Math.sin(rads);
		var $spread       = $(this);
		var pageTransform = 'translateX(' + tarX.toFixed(3) + 'px) translateZ(' + tarZ.toFixed(3) + 'px) rotateY(' + (i * 0.5) + 'deg)';
		$spread.css(cssTransformProperty, pageTransform);
	});
}

function hideLocationBar() {
	if ($body.width() <= 960) {
		$body.css('padding-bottom', '80px');
		setTimeout(function () {
			window.scrollTo(0, 1);
		}, 0);
	}
}

function Popup(graphic, depth, event) {
	if (!event) event = 'pageFolding';
	this.graphic      = graphic;
	this.POPUP_WIDTH  = 300;
	this.POPUP_SQUARE = this.POPUP_WIDTH * this.POPUP_WIDTH;
	this.pwsr         = this.POPUP_WIDTH * Math.sin(degToRad(-15));
	this.pwsrs        = this.pwsr * this.pwsr;
	this.transforms   = {};

	var onFold = function (e, per) { this.setFold(per); }.bind(this);
	graphic.parents('.spread').bind(foldingEvent, onFold);

	var zRot = graphic.parents('.page').hasClass('page-left') ? 15 : -15;
	this.transforms.tY = 'translateY(' + depth + 'px)';
	this.transforms.rZ = 'rotateZ(' + zRot + 'deg)';

	this.setFold(1);
}

Popup.prototype.setFold = function (fold) {
	fold = clamp(fold, 0);
	var adj    = Math.sqrt(this.POPUP_SQUARE - this.pwsrs);
	var f180   = -180 * fold;
	var f180r  = degToRad(f180);
	var f180nr = degToRad((f180) - 90);

	// origin
	var p0 = [0, 0, 0];

	// left piece: bottom outside
	var p1 = [-adj * Math.cos(f180r), adj * Math.sin(f180r), this.pwsr];

	// right piece: bottom outside
	var p2 = [adj, 0, this.pwsr];

	// left piece: top inside
	var p3 = [-this.POPUP_WIDTH * Math.cos(f180nr), this.POPUP_WIDTH * Math.sin(f180nr), 0];


	// normalize the vectors
	var len    = Math.sqrt(p1[0] * p1[0] + p1[1] * p1[1] + p1[2] * p1[2]);
	var normV1 = $V([p1[0] / len, p1[1] / len, p1[2] / len]);
	var normV2 = $V([p2[0] / len, p2[1] / len, p2[2] / len]);
	var normV3 = $V([p3[0] / len, p3[1] / len, p3[2] / len]);

	// calculate the cross vector
	var cross = normV1.cross(normV2);

	// calculate the cross vector's angle from vector 3
	var crossAngle = -radToDeg(cross.angleFrom(normV3)) - 90;

	// transform the shape
	var rX = 'rotateX(' + crossAngle + 'deg)';
	var transform = [this.transforms.tY, this.transforms.rZ, rX].join(' ');
	this.graphic.css(cssTransformProperty, transform);
};
