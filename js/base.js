var popups,
	paperFolding,
	curPageIndex,
	timer,
	zoomedIn,
	curSceneScale,
	curRotX,
	curRotY,
	curPer,
	curDir,
	adjustedPer,
	bgColors,
	$leftPage,
	$rightPage,
	$body,
	$scene,
	$book,
	hasTouch,
	hasOrientation,
	numTouches,
	PAGE_TURN_SPEED = 25;










/****************************

	Pages

****************************/

function startDrag(e) {
	e.preventDefault();
	$book.css('cursor', '-webkit-grabbing');
	$scene.data('offset', hasTouch ? e.originalEvent.touches[0].pageX : e.pageX);
	$body.bind(hasTouch ? 'touchmove' : 'mousemove', updateDrag);
	$body.bind(hasTouch ? 'touchend' : 'mouseup', stopDrag);
}

function updateDrag(e) {
	e.preventDefault();
	
	if($('.drag-notice').hasClass('shown')) {
		$('.drag-notice').removeClass('shown');
	}

	var targetX = (hasTouch ? e.originalEvent.touches[0].pageX : e.pageX) - $scene.data('offset');
	var per = targetX / $body.width() * 2.5;
	var shouldBreak = false;
	
	per = per < -1 ? -1 : per;
	per = per > 1 ? 1 : per;
	
	var dir = per < 0 ? 'left' : 'right';
		
	if(curPer + per < 0 && adjustedPer > 0) {
		shouldBreak = true;
		curPer = adjustedPer = 0;
		stopDrag();
	} else if(curPer + per > 0 && adjustedPer < 0) {
		shouldBreak = true;
		curPer = adjustedPer = 0;
		stopDrag();
	} else {
		adjustedPer = curPer + per;
		adjustedPer = adjustedPer < -1 ? -1 : adjustedPer;
		adjustedPer = adjustedPer > 1 ? 1 : adjustedPer;
		adjustedPer = Math.round(adjustedPer * 1000) / 1000;
	}
	
	var absPer = Math.abs(adjustedPer);
	
	if((curPageIndex == 0 && adjustedPer > 0) || (curPageIndex == 4 && adjustedPer < 0)) {
		stopDrag();
		curPer = adjustedPer = 0;
		return;
	}
	
	if(absPer != 1 && absPer != 0) {
		$('.hotspot').css('pointer-events', 'none');
		$('.hotspot .indicator').css('opacity', '0');
	} else {
		$('.hotspot').css('pointer-events', 'auto');
		$('.hotspot .indicator').css('opacity', '1');
	}
	
	if(!shouldBreak) {
		$leftPage = adjustedPer < 0 ? $('.spreads li').eq( curPageIndex ) : $('.spreads li').eq( curPageIndex - 1 );
		$rightPage = adjustedPer < 0 ? $('.spreads li:nth-child(' + (curPageIndex + 2) + ')') : $('.spreads li:nth-child(' + (curPageIndex + 1) + ')');
		$leftPage.find('.page-right').css({
			'-webkit-transform': 'rotateY(' + (-180 * (adjustedPer < 0 ? absPer : 1 - absPer)) + 'deg)',
			'-moz-transform': 'rotateY(' + (-180 * (adjustedPer < 0 ? absPer : 1 - absPer)) + 'deg)',
			'transform': 'rotateY(' + (-180 * (adjustedPer < 0 ? absPer : 1 - absPer)) + 'deg)'
		});
		
		$rightPage.find('.page-left').css({
			'-webkit-transform': 'rotateY(' + (180 * (adjustedPer < 0 ? 1 - absPer : absPer)) + 'deg)',
			'-moz-transform': 'rotateY(' + (180 * (adjustedPer < 0 ? 1 - absPer : absPer)) + 'deg)',
			'transform': 'rotateY(' + (180 * (adjustedPer < 0 ? 1 - absPer : absPer)) + 'deg)',
		});
				
		paperFolding.per = adjustedPer < 0 ? absPer : 1 - absPer;
		if($leftPage[0]) {
			$leftPage[0].dispatchEvent(paperFolding);
		}
		
		paperFolding.per = adjustedPer < 0 ? 1 - absPer : absPer;
		if($rightPage[0]) {
			$rightPage[0].dispatchEvent(paperFolding);
		}
		
		toggleVisibles(absPer * 180, adjustedPer < 0 ? curPageIndex : curPageIndex - 1);
	} else {
		$leftPage.find('.page-right').css({
			'-webkit-transform': 'rotateY(' + (-180 * (dir == 'right' ? absPer : 1 - absPer)) + 'deg)',
			'-moz-transform': 'rotateY(' + (-180 * (dir == 'right' ? absPer : 1 - absPer)) + 'deg)',
			'transform': 'rotateY(' + (-180 * (dir == 'right' ? absPer : 1 - absPer)) + 'deg)'
		});
		$rightPage.find('.page-left').css({
			'-webkit-transform': 'rotateY(' + (180 * (dir == 'right' ? 1 - absPer : absPer)) + 'deg)',
			'-moz-transform': 'rotateY(' + (180 * (dir == 'right' ? 1 - absPer : absPer)) + 'deg)',
			'transform': 'rotateY(' + (180 * (dir == 'right' ? 1 - absPer : absPer)) + 'deg)'
		});
		paperFolding.per = dir == 'right' ? absPer : 1 - absPer;
		if($leftPage[0]) {
			$leftPage[0].dispatchEvent(paperFolding);
		}
		
		paperFolding.per = dir == 'right' ? 1 - absPer : absPer;
		if($rightPage[0]) {
			$rightPage[0].dispatchEvent(paperFolding);
		}
		
		toggleVisibles(absPer * 180, dir == 'right' ? curPageIndex : curPageIndex - 1);
	}
	
	$('.spreads li').each(function(i) {
		var anglePerPage = 180 / 9;
		var offsetIndex = adjustedPer < 0 ? 5 + curPageIndex - i : 5 + curPageIndex - i - 2;
		var offsetAngle = adjustedPer < 0 ? offsetIndex - adjustedPer - 1 : offsetIndex - adjustedPer + 1;
		var tarX = 5 * Math.cos(degToRad(offsetAngle * anglePerPage + 10));
		var tarZ = 5 * Math.sin(degToRad(offsetAngle * anglePerPage + 10));
		
		$(this).css({
			'-webkit-transform': 'translateX(' + tarX.toFixed(3) + 'px) translateZ(' + tarZ.toFixed(3) + 'px) rotateY(' + (i * .5) + 'deg)',
			'-moz-transform': 'translateX(' + tarX.toFixed(3) + 'px) translateZ(' + tarZ.toFixed(3) + 'px) rotateY(' + (i * .5) + 'deg)',
			'transform': 'translateX(' + tarX.toFixed(3) + 'px) translateZ(' + tarZ.toFixed(3) + 'px) rotateY(' + (i * .5) + 'deg)'
		});
	});	
	
	if(curPageIndex == 0) {
		$book.css({
			'-webkit-transform': 'translateX(' + (-300 + (300 * absPer)) + 'px) rotateX(' + (29 + (61 * absPer)) + 'deg) rotateZ(' + (-8 + (8 * absPer)) + 'deg) translateZ(' + (100 - (100 * absPer)) + 'px)',
			'-moz-transform': 'translateX(' + (-300 + (300 * absPer)) + 'px) rotateX(' + (29 + (61 * absPer)) + 'deg) rotateZ(' + (-8 + (8 * absPer)) + 'deg) translateZ(' + (100 - (100 * absPer)) + 'px)',
			'transform': 'translateX(' + (-300 + (300 * absPer)) + 'px) rotateX(' + (29 + (61 * absPer)) + 'deg) rotateZ(' + (-8 + (8 * absPer)) + 'deg) translateZ(' + (100 - (100 * absPer)) + 'px)'
		});
	} else if(curPageIndex == 1 && adjustedPer > 0) {
		$book.css({
			'-webkit-transform': 'translateX(' + (-300 * absPer) + 'px) rotateX(' + (90 - (61 * absPer)) + 'deg) rotateZ(' + (-8 * absPer) + 'deg) translateZ(' + (100 * absPer) + 'px)',
			'-moz-transform': 'translateX(' + (-300 * absPer) + 'px) rotateX(' + (90 - (61 * absPer)) + 'deg) rotateZ(' + (-8 * absPer) + 'deg) translateZ(' + (100 * absPer) + 'px)',
			'transform': 'translateX(' + (-300 * absPer) + 'px) rotateX(' + (90 - (61 * absPer)) + 'deg) rotateZ(' + (-8 * absPer) + 'deg) translateZ(' + (100 * absPer) + 'px)'
		});
	} else if(curPageIndex == 3 && adjustedPer < 0) {
		$book.css({
			'-webkit-transform': 'translateX(' + (300 * absPer) + 'px) rotateX(' + (90 - (61 * absPer)) + 'deg) rotateZ(' + (-8 * absPer) + 'deg) translateZ(' + (100 * absPer) + 'px) translateY(' + (-120 * absPer) + 'px)',
			'-moz-transform': 'translateX(' + (300 * absPer) + 'px) rotateX(' + (90 - (61 * absPer)) + 'deg) rotateZ(' + (-8 * absPer) + 'deg) translateZ(' + (100 * absPer) + 'px) translateY(' + (-120 * absPer) + 'px)',
			'transform': 'translateX(' + (300 * absPer) + 'px) rotateX(' + (90 - (61 * absPer)) + 'deg) rotateZ(' + (-8 * absPer) + 'deg) translateZ(' + (100 * absPer) + 'px) translateY(' + (-120 * absPer) + 'px)'
		});
	} else if(curPageIndex == 4) {
		$book.css({
			'-webkit-transform': 'translateX(' + (300 - (300 * adjustedPer)) + 'px) rotateX(' + (29 + (61 * adjustedPer)) + 'deg) rotateZ(' + (-8 + (8 * adjustedPer)) + 'deg) translateZ(' + (100 - (100 * adjustedPer)) + 'px) translateY(' + (-120 + (120 * adjustedPer)) + 'px)',
			'-moz-transform': 'translateX(' + (300 - (300 * adjustedPer)) + 'px) rotateX(' + (29 + (61 * adjustedPer)) + 'deg) rotateZ(' + (-8 + (8 * adjustedPer)) + 'deg) translateZ(' + (100 - (100 * adjustedPer)) + 'px) translateY(' + (-120 + (120 * adjustedPer)) + 'px)',
			'transform': 'translateX(' + (300 - (300 * adjustedPer)) + 'px) rotateX(' + (29 + (61 * adjustedPer)) + 'deg) rotateZ(' + (-8 + (8 * adjustedPer)) + 'deg) translateZ(' + (100 - (100 * adjustedPer)) + 'px) translateY(' + (-120 + (120 * adjustedPer)) + 'px)'
		});
	}
	
	var color1 = adjustedPer < 0 ? bgColors[curPageIndex] : bgColors[curPageIndex - 1];
	var color2 = adjustedPer < 0 ? bgColors[curPageIndex + 1] : bgColors[curPageIndex];
	var mixedColor = Color.towards(color1, color2, adjustedPer < 0 ? absPer : 1 - absPer);
	
	if(!hasTouch) {
		//$body.css('background-color', mixedColor);
	}
	
	if(absPer >= 1) {
		adjustedPer < 0 ? curPageIndex++ : curPageIndex--;
		curPer = adjustedPer = 0;
		stopDrag();
	}
}

function stopDrag(e) {
	curDir = null;
	curPer = adjustedPer;
	$body.unbind(hasTouch ? 'touchmove' : 'mousemove');
	$body.unbind(hasTouch ? 'touchend' : 'mouseup');
	$book.css('cursor', '-webkit-grab');
}

function toggleVisibles(per, leftIndex) {
	var curPage = $('.spreads li').eq( curPageIndex );
	var nextPage = $('.spreads li').eq(curPageIndex + 1);
	var prevPage = $('.spreads li').eq(curPageIndex - 1);

	var toTurn1;
	var toTurn2;

	if(leftIndex == curPageIndex) {
		toTurn1 = curPage;
		toTurn2 = nextPage;
	} else {
		toTurn1 = curPage;
		toTurn2 = prevPage;
	}
	
	if(per > 179.5) {
		toTurn1.find('.popup').hide();
		toTurn1.find('.hotspot').hide();
	} else {
		toTurn1.find('.popup').show();
		toTurn1.find('.hotspot').show();
	}
	
	if(per < .5) {
		toTurn2.find('.popup').hide();
		toTurn2.find('.hotspot').hide();
	} else {
		toTurn2.find('.popup').show();
		toTurn2.find('.hotspot').show();
	}
	
	if(per > 160) {
		toTurn1.find('.hotspot .indicator').hide();
	} else {
		toTurn1.find('.hotspot .indicator').show();
	}
	
	if(per < 20) {
		toTurn2.find('.hotspot .indicator').hide();
	} else {
		toTurn2.find('.hotspot .indicator').show();
	}
}

function turnFlatPage(e) {
	e.preventDefault();
	
}








/****************************

	Hotspots

****************************/


function zoomToHotspot(e) {
	e.preventDefault();
	
	$body.unbind('click');
	var hotspot = $('.hotspot.focused').length > 0 ? $('.hotspot.focused') : $(this);
	var indicator = hotspot.children('.indicator');
	
	if(zoomedIn) {
		setTimeout(function(e) {
			hotspot.removeClass('focused');
		}, 1);
		$('.spreads li').show();
		$scene.css({
			'pointer-events': 'auto'
		});
		adjustScene();
		$scene.bind('webkitTransitionEnd', function(e) {
			$scene.css('-webkit-transition', 'none');
			$scene.unbind('webkitTransitionEnd');
			$(document).mousemove(rotateScene);
			if(hasOrientation) {
				window.addEventListener('orientationchange', reorient, false);
				window.addEventListener('deviceorientation', rotateScene, false);
			}
		});
		$scene.bind('transitionend', function(e) {
			$scene.css('-moz-transition', 'none');
			$scene.unbind('transitionend');
			$(document).mousemove(rotateScene);
			if(hasOrientation) {
				window.addEventListener('orientationchange', reorient, false);
				window.addEventListener('deviceorientation', rotateScene, false);
			}
		});
	} else {
		hotspot.addClass('focused');
		var thisSpread = hotspot.parents('.spreads li');
		$('.spreads li').not(thisSpread).hide();
		indicator.css({
			'margin-left': indicator.attr('data-offsetX') + 'px',
			'margin-top': indicator.attr('data-offsetY') + 'px'
		});
		$(document).unbind('mousemove');
		if(hasOrientation) {
			window.removeEventListener('orientationchange', reorient);
			window.removeEventListener('deviceorientation', rotateScene);
		}
		$scene.css({
			'-webkit-transition': 'all .6s',
			'-moz-transition': 'all .6s',
			'transition': 'all .6s',
			'pointer-events': 'none'
		});
		
		setTimeout(function() {
			$body.click('click', zoomToHotspot);
			$(body).bind('touchend', zoomToHotspot);
		}, 1);
		
		var section = $(this).parent().parent().attr('class');
		
		switch(section) {
			case 'intro':
				$scene.css({
					'-webkit-transform': 'translateY(-200px) translateX(400px) translateZ(400px) rotateX(-90deg) rotateY(5deg) rotateZ(1deg)',
					'-moz-transform': 'translateY(-200px) translateX(400px) translateZ(400px) rotateX(-90deg) rotateY(5deg) rotateZ(1deg)',
					'transform': 'translateY(-200px) translateX(400px) translateZ(400px) rotateX(-90deg) rotateY(5deg) rotateZ(1deg)'
				});
				break;
			case 'location':
				$scene.css({
					'-webkit-transform': 'translateY(-150px) translateX(-330px) translateZ(400px) rotateX(-90deg) rotateY(5deg) rotateZ(1deg)',
					'-moz-transform': 'translateY(-150px) translateX(-330px) translateZ(400px) rotateX(-90deg) rotateY(5deg) rotateZ(1deg)',
					'transform': 'translateY(-150px) translateX(-330px) translateZ(400px) rotateX(-90deg) rotateY(5deg) rotateZ(1deg)'
				});
				break;
			case 'music':
				$scene.css({
					'-webkit-transform': 'translateY(-200px) translateX(400px) translateZ(400px) rotateX(-90deg) rotateY(5deg) rotateZ(1deg)',
					'-moz-transform': 'translateY(-200px) translateX(400px) translateZ(400px) rotateX(-90deg) rotateY(5deg) rotateZ(1deg)',
					'transform': 'translateY(-200px) translateX(400px) translateZ(400px) rotateX(-90deg) rotateY(5deg) rotateZ(1deg)'
				});
				break;
		}
	}
	
	zoomedIn = !zoomedIn;
}










/****************************

	Scenes

****************************/


function rotateScene(e) {
	curRotY = hasOrientation ? 0 + (15 * (e.beta / 45)) : -15 + (30 * e.pageX / $body.width());
	curRotX = -15;
	adjustScene();
}

function reorient(e) {
	window.scrollTo(0, 1);
	var portrait = (window.orientation % 180 == 0);
	$('body').css('-webkit-transform', portrait ? 'rotate(90deg)' : '');
}

function adjustScene() {	
	$scene.css({
		'-webkit-transform': 'scale3d(' + curSceneScale + ', ' + curSceneScale + ', ' + curSceneScale + ') translateY(100px) rotateX(' + curRotX + 'deg) rotateY(' + curRotY + 'deg)',
		'-moz-transform': 'scale3d(' + curSceneScale + ', ' + curSceneScale + ', ' + curSceneScale + ') translateY(100px) rotateX(' + curRotX + 'deg) rotateY(' + curRotY + 'deg)',
		'transform': 'scale3d(' + curSceneScale + ', ' + curSceneScale + ', ' + curSceneScale + ') translateY(100px) rotateX(' + curRotX + 'deg) rotateY(' + curRotY + 'deg)'
	});
}

function resizeScene(e) {
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









/****************************

	Setup

****************************/


function craftThatPaperBaby() {
	popups = [];
	$('.popup').each(function(i) {
		var master = $(this).parent().parent();
		var depth = $(this).attr('data-depth');
		var popup = new Popup($(this), depth);
		popups.push(popup);
	});
	
	$('.spreads li').each(function(i) {
		var anglePerPage = 180 / 9;
		var offsetIndex = 5 + curPageIndex - i;
		var offsetAngle = offsetIndex - 1;
		var tarX = 5 * Math.cos(degToRad(offsetAngle * anglePerPage + 10));
		var tarZ = 5 * Math.sin(degToRad(offsetAngle * anglePerPage + 10));
		$(this).css({
			'-webkit-transform': 'translateX(' + tarX.toFixed(3) + 'px) translateZ(' + tarZ.toFixed(3) + 'px) rotateY(' + (i * .5) + 'deg)',
			'-moz-transform': 'translateX(' + tarX.toFixed(3) + 'px) translateZ(' + tarZ.toFixed(3) + 'px) rotateY(' + (i * .5) + 'deg)',
			'transform': 'translateX(' + tarX.toFixed(3) + 'px) translateZ(' + tarZ.toFixed(3) + 'px) rotateY(' + (i * .5) + 'deg)'
		});
	});
}

$(document).ready(function() {
	paperFolding = document.createEvent('Event');
	paperFolding.initEvent('pageFolding', true, true);
	
	curPageIndex = 0;
	curSceneScale = 1;
	curRotX = -15;
	curRotY = 0;
	curPer = adjustedPer = 0;
	zoomedIn = false;
	curRotX = -15;
	numTouches = 0;
	bgColors = ['#3272ad', '#ae0039', '#50326d', '#355506', '#3272ad'];
	$body = $('body');
	$scene = $('.scene');
	$book = $('.book');
	hasTouch = Modernizr.touch;
	has3d = Modernizr.csstransforms3d;
	
	if(!has3d) {
		$body.addClass('no3d');
		$body.click(turnFlatPage);
	} else {
		craftThatPaperBaby();
		if(hasTouch) {
			$body.css('padding-bottom', '100px');
			setTimeout(function() {
				window.scrollTo(0, 1);
			}, 0);
			$('.drag-notice').html('Touch and drag<br />to turn pages!');
			$('.drag-notice').css({
				'width': '220px'
			});
			$body.bind('touchstart', startDrag);
			$(window).resize(resizeScene);
			if(window.DeviceMotionEvent != undefined) {
				hasOrientation = true;
				window.addEventListener('orientationchange', reorient, false);
				window.addEventListener('deviceorientation', rotateScene, false);
			}
			$('.hotspot').bind('touchend', zoomToHotspot);
		} else {		
			$scene.mousedown(startDrag);
			$(document).mousemove(rotateScene);
			$(window).resize(resizeScene);
			$('.hotspot').click(zoomToHotspot);
		}
	}
	
	resizeScene();
	adjustScene();
});







