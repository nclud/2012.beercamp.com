var popups,
	paperFolding,
	curPageIndex,
	timer,
	zoomedIn,
	PAGE_TURN_SPEED = 50,
	$body,
	$scene,
	$book,
	isAnimating = false;


$(document).ready(function() {
	paperFolding = document.createEvent('Event');
	paperFolding.initEvent('pageFolding', true, true);
	
	curPageIndex = 0;
	zoomedIn = false;
	
	craftThatPaperBaby();

	$body = $('body');
	$scene = $('.scene');
	$book = $('.book');

	$('.thumb').mousedown(startDrag);
	$(document).mousemove(rotateScene);
	//$scene.css('-webkit-transform', 'translateY(100px) rotateX(-90deg) rotateY(0deg)');
	
	$('.prev-btn').click(prev);
	$('.next-btn').click(next);
	
	$(window).keydown(function(e) {
		switch(e.keyCode) {
			case 39:
				e.preventDefault();
				next();
				break;
			case 37:
				e.preventDefault();
				prev();
				break;
		}
	});
	
	$('.hotspot').click(zoomToHotspot);
});

function next(e) {
	if(e) {
		e.preventDefault();
	}
	if(curPageIndex == 0) {
		$book.attr('class', 'book opened');
	} else if(curPageIndex == 3) {
		$book.attr('class', 'book on-back');
	}
	nextPage(null);
}

function prev() {	
	if(curPageIndex == 1) {		
		$book.attr('class', 'book on-cover');
	} else if(curPageIndex == 4) {
		$book.attr('class', 'book opened');
	}
	prevPage(null);
}

function zoomToHotspot(e) {
	e.preventDefault();
		
	if(zoomedIn) {
		$(document).mousemove(rotateScene);
		$scene.css('-webkit-transform', 'translateY(100px) rotateX(-15deg) rotateY(5deg)');
		$scene.bind('webkitTransitionEnd', function(e) {
			$scene.css('-webkit-transition', 'none');
			$scene.unbind('webkitTransitionEnd');
		});
	} else {
		$(document).unbind('mousemove');	
		$scene.css('-webkit-transition', 'all .6s');
		
		var section = $(this).parent().parent().attr('class');
		
		switch(section) {
			case 'intro':
				$scene.css('-webkit-transform', 'translateY(-200px) translateX(400px) translateZ(400px) rotateX(-90deg) rotateY(5deg)');
				break;
			case 'location':				
				$scene.css('-webkit-transform', 'translateY(-150px) translateX(-330px) translateZ(400px) rotateX(-90deg) rotateY(5deg)');
				break;
			case 'music':				
				$scene.css('-webkit-transform', 'translateY(-200px) translateX(400px) translateZ(400px) rotateX(-90deg) rotateY(5deg)');
				break;
		}
	}
	
	zoomedIn = !zoomedIn;
}

function startDrag(e) {
	$('.thumb').data('offset', e.pageX - $('.thumb').offset().left);
	$body.mousemove(updateDrag);
	$body.mouseup(stopDrag);
}

function updateDrag(e) {
	var targetX = (e.pageX - $('.thumb').data('offset') - $('.slider').offset().left);
	if(targetX < 0) {
		targetX = 0;
	} else if(targetX > 180) {
		targetX = 180;
	}
	$('.thumb').css('left', targetX + 'px');
	var per = targetX / 180;	
	
	curPageIndex = 1;
	
	var $curPage = $('.spreads li:nth-child(' + curPageIndex + ')');
	var $nextPage = $('.spreads li:nth-child(' + (curPageIndex + 1) + ')');
	
	$curPage.find('.page-right').css('-webkit-transform', 'rotateY(' + (-180 * per) + 'deg)');
	$nextPage.find('.page-left').css('-webkit-transform', 'rotateY(' + (180 * (1 - per)) + 'deg)');
	
	$('.spreads li').each(function(i) {
		var offsetIndex = i - curPageIndex;
		var targetZ = -1 * Math.abs((offsetIndex * 4) + (4 * (1 - per)));
		$(this).css('-webkit-transform', 'translateZ(' + targetZ + 'px)');
	});			
				
	paperFolding.per = per;
	$('.spreads li:nth-child(' + curPageIndex + ')')[0].dispatchEvent(paperFolding);
	
	paperFolding.per = 1 - per;
	$('.spreads li:nth-child(' + (curPageIndex + 1) + ')')[0].dispatchEvent(paperFolding);
	
	if(180 * per > 179.5) {
		$curPage.find('.popup').hide();
		$curPage.find('.hotspot').hide();
	} else {
		$curPage.find('.popup').show();
		$curPage.find('.hotspot').show();
	}
	
	if(180 * per < .5) {
		$nextPage.find('.popup').hide();
		$nextPage.find('.hotspot').hide();
	} else {
		$nextPage.find('.popup').show();
		$nextPage.find('.hotspot').show();
	}
}

function stopDrag(e) {
	$body.unbind('mousemove');
	$body.unbind('moveup');
}

function rotateScene(e) {
	var rY = -15 + (30 * e.pageX / $body.width());
	var rX = -30 + ( 30 * e.pageY / $body.height() );
	$scene.css('-webkit-transform', 'translateY(100px) rotateX(' + rX + 'deg) rotateY(' + rY + 'deg)');
}



function changeBackground(i) {
	/*
	switch(i) {
		case 0:
			break;
		case 1:
			$body.css('background-color', '#840535');
			break;
		case 2:
			$body.css('background-color', '#004e7b');
			break;
		case 3:
			$body.css('background-color', '#355506');
			
			break;
		case 4:
			break;
	}
	*/
}



function nextPage(e) {
	changePage( 1, e );
}

function prevPage(e) {
	changePage( -1, e );
}


function changePage( delta, event ) {
	// don't change if already animating
	if ( isAnimating ) {
		return;
	}


	if ( event ) {
		event.preventDefault();
	}
	
	// update current page index
	curPageIndex += delta;

	var isNext = delta === 1;
	
	var per = 0;
	var timerElapsed = 0;

	// get jQuery elems before interval begins
	var $spreadsList = $('.spreads');
	// get spreads
	var $openingSpread = $spreadsList.children('li').eq( curPageIndex );
	var $closingSpread = $spreadsList.children('li').eq( curPageIndex - delta );
	// angles where pages begin
	var openingStartAngle = isNext ? 180 : -180;
	var closingStartAngle = isNext ? -180 : 180;
	// get pages
	var openingPageSelector = isNext ? '.page-left' : '.page-right';
	var closingPageSelector = isNext ? '.page-right' : '.page-left';
	var $openingPage = $openingSpread.find( openingPageSelector);
	var $closingPage = $closingSpread.find( closingPageSelector );
	// get stuff to hide
	var $openingPopup = $openingSpread.find('.popup');
	var $closingPopup = $closingSpread.find('.popup');
	var $openingHotspot = $openingSpread.find('.hotspot');
	var $closingHotspot = $closingSpread.find('.hotspot');
	
	isAnimating = true;

	timer = setInterval(function() {
		if(timerElapsed < PAGE_TURN_SPEED) {
			timerElapsed++;
			per = timerElapsed / PAGE_TURN_SPEED;
			
 			$openingPage.css('-webkit-transform', 'rotateY(' + ( openingStartAngle * (1 - per)) + 'deg)');
			$closingPage.css('-webkit-transform', 'rotateY(' + ( closingStartAngle * per) + 'deg)');
						
			$('.spreads').css('-webkit-transform', 'rotateY(-' + (((curPageIndex - 1) * .5) + (per * .5)) + 'deg)');
			
			paperFolding.per = 1 - per;
			$openingSpread[0].dispatchEvent(paperFolding);
			
			paperFolding.per = per;
			$closingSpread[0].dispatchEvent(paperFolding);
			
			if(180 * per > 179.5) {
				$closingPopup.hide();
				$closingHotspot.hide();
			} else {
				$closingPopup.show();
				$closingHotspot.show();
			}
			
			if(180 * per < .5) {
				$openingPopup.hide();
				$openingHotspot.hide();
			} else {
				$openingPopup.show();
				$openingHotspot.show();
			}
		} else {
			clearInterval(timer);
			changeBackground(curPageIndex);
			isAnimating = false;
		}
	}, 17 );


}





function degToRad(deg) {
	return deg * Math.PI / 180;
}

function radToDeg(rad) {
	return rad * 180 / Math.PI;
}









function craftThatPaperBaby() {
	popups = [];
	$('.popup').each(function(i) {
		$(this).hide();
		var master = $(this).parent().parent();
		var depth = $(this).attr('data-depth');
		var popup = new Popup($(this), depth);
		popups.push(popup);
	});
	
	$('.spreads li').each(function(i) {
		$(this).css('-webkit-transform', 'translateZ(0px) rotateY(' + (i * .5) + 'deg)');
	});	
}


