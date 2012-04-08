var PAGE_TURN_SPEED       = 25,
	paperFolding          = 'pageFolding',
	zoomedIn              = false,
	curPageIndex          = 0,
	curSceneScale         = 1,
	curRotX               = -15,
	curRotY               = 0,
	curPer                = 0,
	adjustedPer           = 0,
	numTouches            = 0,
	bgColors              = ['#3272ad', '#ae0039', '#50326d', '#355506', '#3272ad'],
	domTransformProperty  = Modernizr.prefixed('transform'),
	cssTransformProperty  = domToCss(domTransformProperty),
	domTransitionProperty = Modernizr.prefixed('transition'),
	cssTransitionProperty = domToCss(domTransitionProperty),
	hasTouch              = Modernizr.touch,
	hasMotion             = Modernizr.devicemotion,
	hasOrientation        = Modernizr.deviceorientation,
	has3d                 = Modernizr.csstransforms3d,
	rotationEvent         = (hasTouch && hasOrientation) ? 'deviceorientation' : 'mousemove',
	dragStartEvent        = hasTouch ? 'touchstart' : 'mousedown',
	dragMoveEvent         = hasTouch ? 'touchmove' : 'mousemove',
	dragStopEvent         = hasTouch ? 'touchend' : 'mouseup',
	selectionEvent        = hasTouch ? 'touchend' : 'click',
	transitionEndEvent    = {
		'WebkitTransition' : 'webkitTransitionEnd',
		'MozTransition'    : 'transitionend',
		'OTransition'      : 'oTransitionEnd',
		'msTransition'     : 'MSTransitionEnd',
		'transition'       : 'transitionend'
	}[ domTransitionProperty ],
	initialOrientation,
	curPageIndex,
	timer,
	$leftPage,
	$rightPage,
	$document = $(document),
	$window = $(window),
	$body,
	$scene,
	$book,
	$spreads,
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
		$hotSpots.bind(selectionEvent, zoomToHotspot);

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

	if ($dragNotice.hasClass('shown')) {
		$dragNotice.removeClass('shown');
	}

	var offset = e.data.offset;
	var width = e.data.width;
	var targetX = hasTouch ? e.originalEvent.touches[0].pageX : e.pageX - offset;
	var per = clamp(targetX / width * 2.5, -1, 1);
	var shouldBreak = false;
	var dir = per < 0 ? 'left' : 'right';

	if (curPer + per < 0 && adjustedPer > 0) {
		shouldBreak = true;
		curPer = adjustedPer = 0;
		stopDrag();
	} else if (curPer + per > 0 && adjustedPer < 0) {
		shouldBreak = true;
		curPer = adjustedPer = 0;
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
		$leftPage = adjustedPer < 0 ? $spreads.eq( curPageIndex ) : $spreads.eq( curPageIndex - 1 );
		$rightPage = adjustedPer < 0 ? $spreads.eq(curPageIndex + 1) : $spreads.eq(curPageIndex);
		rightTransform = 'rotateY(' + (-180 * (adjustedPer < 0 ? absPer : 1 - absPer)) + 'deg)';
		leftTransform = 'rotateY(' + (180 * (adjustedPer < 0 ? 1 - absPer : absPer)) + 'deg)';
		$leftPage.find('.page-right').css(cssTransformProperty, rightTransform);
		$rightPage.find('.page-left').css(cssTransformProperty, leftTransform);

		$leftPage.trigger(paperFolding, adjustedPer < 0 ? absPer : 1 - absPer);
		$rightPage.trigger(paperFolding, adjustedPer < 0 ? 1 - absPer : absPer);

		toggleVisibles(absPer * 180, adjustedPer < 0 ? curPageIndex : curPageIndex - 1);
	} else {
		rightTransform = 'rotateY(' + (-180 * (dir == 'right' ? absPer : 1 - absPer)) + 'deg)';
		leftTransform = 'rotateY(' + (180 * (dir == 'right' ? 1 - absPer : absPer)) + 'deg)';
		$leftPage.find('.page-right').css(cssTransformProperty, rightTransform);
		$rightPage.find('.page-left').css(cssTransformProperty, leftTransform);

		$leftPage.trigger(paperFolding, dir == 'right' ? absPer : 1 - absPer);
		$rightPage.trigger(paperFolding, dir == 'right' ? 1 - absPer : absPer);

		toggleVisibles(absPer * 180, dir == 'right' ? curPageIndex : curPageIndex - 1);
	}

	$spreads.each(function (i) {
		var anglePerPage = 180 / 9;
		var offsetIndex = adjustedPer < 0 ? 5 + curPageIndex - i : 5 + curPageIndex - i - 2;
		var offsetAngle = adjustedPer < 0 ? offsetIndex - adjustedPer - 1 : offsetIndex - adjustedPer + 1;
		var rads = degToRad(offsetAngle * anglePerPage + 10);
		var tarX = 5 * Math.cos(rads);
		var tarZ = 5 * Math.sin(rads);
		var transform = 'translateX(' + tarX.toFixed(3) + 'px) translateZ(' + tarZ.toFixed(3) + 'px) rotateY(' + (i * 0.5) + 'deg)';
		$(this).css(cssTransformProperty, transform);
	});

	var bookTransform;
	if (curPageIndex == 0) {
		bookTransform = 'translateX(' + (-300 + (300 * absPer)) + 'px) rotateX(' + (29 + (61 * absPer)) + 'deg) rotateZ(' + (-8 + (8 * absPer)) + 'deg) translateZ(' + (100 - (100 * absPer)) + 'px)';
	} else if (curPageIndex == 1 && adjustedPer > 0) {
		bookTransform = 'translateX(' + (-300 * absPer) + 'px) rotateX(' + (90 - (61 * absPer)) + 'deg) rotateZ(' + (-8 * absPer) + 'deg) translateZ(' + (100 * absPer) + 'px)';
	} else if (curPageIndex == 3 && adjustedPer < 0) {
		bookTransform = 'translateX(' + (300 * absPer) + 'px) rotateX(' + (90 - (61 * absPer)) + 'deg) rotateZ(' + (-8 * absPer) + 'deg) translateZ(' + (100 * absPer) + 'px) translateY(' + (-120 * absPer) + 'px)';
	} else if (curPageIndex == 4) {
		bookTransform = 'translateX(' + (300 - (300 * adjustedPer)) + 'px) rotateX(' + (29 + (61 * adjustedPer)) + 'deg) rotateZ(' + (-8 + (8 * adjustedPer)) + 'deg) translateZ(' + (100 - (100 * adjustedPer)) + 'px) translateY(' + (-120 + (120 * adjustedPer)) + 'px)';
	}
	$book.css(cssTransformProperty, bookTransform);

	if (absPer >= 1) {
		adjustedPer < 0 ? curPageIndex++ : curPageIndex--;
		curPer = adjustedPer = 0;
		stopDrag();
	}
}

function stopDrag(e) {
	curDir = null;
	curPer = adjustedPer;
	$body.unbind(dragMoveEvent);
	$body.unbind(dragStopEvent);
	$book.css('cursor', '-webkit-grab');
}

function toggleVisibles(per, leftIndex) {
	var curPage = $spreads.eq( curPageIndex );
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


function zoomToHotspot(e) {
	e.preventDefault();

	$body.unbind(selectionEvent);
	$window.unbind(rotationEvent);
	var $spot = $(this);
	var $focusedSpot = $hotSpots.filter('.focused');
	var hotspot = $focusedSpot.length > 0 ? $focusedSpot : $spot;
	var indicator = hotspot.children('.indicator');

	if (zoomedIn) {
		setTimeout(function (hotspot) {
			hotspot.removeClass('focused');
		}, 1, hotspot);
		$spreads.show();

		adjustScene();

		$body.bind(dragStartEvent, startDrag);

		setTimeout(function ($scene) {
			$scene.css(cssTransitionProperty, 'none');
			$scene.unbind(domTransitionProperty);
		}, 600, $scene);
		$window.bind(rotationEvent, rotateScene);
	} else {
		hotspot.addClass('focused');
		var thisSpread = hotspot.parents('.spread');
		$spreads.not(thisSpread).hide();
		indicator.css({
			'margin-left': indicator.attr('data-offsetX') + 'px',
			'margin-top': indicator.attr('data-offsetY') + 'px'
		});

		$body.unbind(dragStartEvent);
		$window.unbind(rotationEvent, rotateScene);
		$body.unbind(dragMoveEvent);

		$scene.css(cssTransitionProperty, 'all .6s');

		setTimeout(function ($body) {
			$body.bind(selectionEvent, zoomToHotspot);
		}, 1, $body);

		var $spread = $spot.parents('.spread');
		var scale = (1 - ((1 - curSceneScale) * 0.3));
		var scaleTransform = 'scale3d(' + scale + ', ' + scale + ', ' + scale + ')';
		var translateTransform;
		var spreadTransform;
		if ($spread.hasClass('intro')) {
			translateTransform = 'translateY(-200px) translateX(400px) translateZ(400px) rotateX(-90deg) rotateY(5deg) rotateZ(1deg)';
		} else if ($spread.hasClass('location')) {
			translateTransform = 'translateY(-150px) translateX(-330px) translateZ(400px) rotateX(-90deg) rotateY(5deg) rotateZ(1deg)';
		} else if ($spread.hasClass('music')) {
			translateTransform = 'translateY(-200px) translateX(315px) translateZ(400px) rotateX(-90deg) rotateY(5deg) rotateZ(1deg)';
		}
		spreadTransform = scaleTransform + ' ' + translateTransform;
		$scene.css(cssTransformProperty, spreadTransform);
	}

	zoomedIn = !zoomedIn;
}










/****************************

	Scenes

****************************/


function rotateScene(e) {
	var o = e.originalEvent;
	var theta = (Math.abs(window.orientation) == 90) ? o.beta : o.gamma;
	curRotY = e.type === 'deviceorientation' ? 0 + (15 * (theta / -45)) : -15 + (30 * e.pageX / $body.width());
	curRotX = -15;

	adjustScene();
}

function adjustScene() {
	var sceneTransform = 'scale3d(' + curSceneScale + ', ' + curSceneScale + ', ' + curSceneScale + ') translateY(100px) rotateX(' + curRotX + 'deg) rotateY(' + curRotY + 'deg)';
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
		var depth = $popup.attr('data-depth');
		var popup = new Popup($popup, depth, paperFolding);
	});

	$spreads.each(function (i) {
		var anglePerPage = 180 / 9;
		var offsetIndex = 5 + curPageIndex - i;
		var offsetAngle = offsetIndex - 1;
		var rads = degToRad(offsetAngle * anglePerPage + 10);
		var tarX = 5 * Math.cos(rads);
		var tarZ = 5 * Math.sin(rads);
		var $spread = $(this);
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
	this.graphic = graphic;
	this.depth = depth;
	this.zRot = graphic.parents('.page').hasClass('page-left') ? 15 : -15;
	this.POPUP_WIDTH = 300;
	this.POPUP_SQUARE = this.POPUP_WIDTH * this.POPUP_WIDTH;
	this.pwsr = this.POPUP_WIDTH * Math.sin(degToRad(-15));
	this.pwsrs = this.pwsr * this.pwsr
	;

	var onFold = function (e, per) { this.setFold(per); }.bind(this);
	graphic.parents('.spread').bind(paperFolding, onFold);
	this.setFold(1);
}

Popup.prototype.setFold = function (fold) {
	fold = clamp(fold, 0);
	var adj = Math.sqrt(this.POPUP_SQUARE - this.pwsrs);
	var f180 = -180 * fold;
	var f180r = degToRad(f180);
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
	var len = Math.sqrt(p1[0] * p1[0] + p1[1] * p1[1] + p1[2] * p1[2]);
	var normV1 = $V([p1[0] / len, p1[1] / len, p1[2] / len]);
	var normV2 = $V([p2[0] / len, p2[1] / len, p2[2] / len]);
	var normV3 = $V([p3[0] / len, p3[1] / len, p3[2] / len]);

	// calculate the cross vector
	var cross = normV1.cross(normV2);
	
	// calculate the cross vector's angle from vector 3
	var crossAngle = -radToDeg(cross.angleFrom(normV3)) - 90;
	
	// transform the shape
	var transform = 'translateY(' + this.depth + 'px) rotateZ(' + this.zRot + 'deg) rotateX(' + crossAngle + 'deg)';
	this.graphic.css(cssTransformProperty, transform);
}