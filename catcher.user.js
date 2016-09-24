// ==UserScript==
// @name         YT donation catcher
// @namespace    https://github.com/MiChAeLoKGB/YouTubeDonationCatcher
// @version      1.24
// @description  Catches donations on YouTube stream and shows them in separate chat!
// @author       MiChAeLoKGB
// @match        https://www.youtube.com/live_dashboard
// @match        https://www.youtube.com/watch?*
// @updateURL    https://raw.githubusercontent.com/MiChAeLoKGB/YouTubeDonationCatcher/master/catcher.user.js
// @downloadURL  https://raw.githubusercontent.com/MiChAeLoKGB/YouTubeDonationCatcher/master/catcher.user.js
// @require      https://code.jquery.com/jquery-1.12.3.min.js
// @require      https://code.jquery.com/ui/1.11.4/jquery-ui.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery.perfect-scrollbar/0.6.10/js/min/perfect-scrollbar.jquery.min.js
// @grant        none
// ==/UserScript==

(function(){
	'use strict';


	/****************/
	/*   SETTINGS   */
	/****************/

	var minimum_donation = 1, // Minimum donation ammount ($ = € = £), no currency conversion is done.
		scheme = 'light'; // "light" or "dark" color scheme.


	/**********************/
	/*   Info variables   */
	/**********************/

	var identificator;
	if (window.location.href == 'https://www.youtube.com/live_dashboard') identificator = 'dashboard';
	else if (window.location.href.indexOf('https://www.youtube.com/watch') >= 0) identificator = 'watch';
	else return;

	var is_pinned = localStorage.getItem('YTDC_pinned_'+identificator),
		position = localStorage.getItem('YTDC_position_'+identificator),
		size = localStorage.getItem('YTDC_size_'+identificator);


	/*********************/
	/* Include css files */
	/*********************/

	var files  = '<link href="https://code.jquery.com/ui/1.11.4/themes/smoothness/jquery-ui.css" rel="stylesheet" type="text/css">\n';
		files += '<link href="https://cdnjs.cloudflare.com/ajax/libs/jquery.perfect-scrollbar/0.6.10/css/perfect-scrollbar.min.css" rel="stylesheet" type="text/css">\n';

	$('head').append(files);


	/***************/
	/*   Add CSS   */
	/***************/

	// Believe it or not, adding to variable like this is 16% faster than using + at the end of the line and continuing on new line...
	var css  = '.donation-widget { width: 450px; height: 300px; float: left; position: fixed; bottom: 5px; left: 0; z-index: 1010; }';
		css += '.donation-widget.pinned { position: absolute; }';
		css += '.donation-widget.enable { width: auto; height: auto; padding: 5px; bottom: 0; }';
		css += '.enable_widget{ cursor: pointer; }';
		css += '.draggable { opacity: 0.7; }';
		css += '.donation-widget .title { padding: 5px 10px; box-shadow: 0 2px 1px -1px #909090; cursor: move; z-index: 10; position: relative; }';
		css += '.remove_widget, .pin_widget { cursor: pointer; float: right; font-size: 10px; text-transform: uppercase; }';
		css += '.pin_widget { margin-left: 10px; }';
		css += '.donation-widget.pinned .pin_widget::before { content: "UN"; }';
		css += '.donation-messages { position: absolute; left: 0; width: 100%; top: 20px; bottom: 0; margin-top: 5px; padding-top: 5px; overflow-y: auto; }';
		css += '.message { padding: 5px 10px; }';
		css += '.message_author, .message_time, .message_tip { max-width: 40%; max-width: calc(100% - 200px); display: inline-block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; vertical-align: middle; }';
		css += '.message_time { max-width: 70px; }';
		css += '.message_tip { max-width: 50px; font-weight: bold; color: #0F9D58; }';
		css += '.delete_tip_message { float: right; cursor: pointer; margin-right: 5px; background: no-repeat url(//s.ytimg.com/yts/imgbin/www-hitchhiker-vflVAomqi.webp) 0px -432px; background-size: auto; width: 15px; height: 15px; }';
		css += '.ui-resizable-se { right: 0px; bottom: 0px; }';

	if (scheme === 'dark'){
		css += '.donation-widget { background-color: #1b1b1b; border: 1px solid #000000; float: left; color: #fff; }';
		css += '.message { border-bottom: 1px solid #292929; background-color: #1b1b1b; }';
		css += '.message:nth-child(even) { background-color: #222222; }';
        css += '.message_author { color: #9A9A9A;}';
		css += '.ui-resizable-se { filter: invert(1); -webkit-filter: invert(1); }';
	}else{
		css += '.donation-widget { background-color: #ffffff; border: 1px solid #e2e2e2; float: left; color: #000; }';
		css += '.message { border-bottom: 1px solid #e2e2e2; background-color: #fff; }';
		css += '.message:nth-child(even) { background-color: #fbfbfb; }';
        css += '.message_author { color: #444; }';
	}

	$('head').append('<style>'+css+'</style>');


	/*********************/
	/*   Toggle widget   */
	/*********************/

	function show_enable(){
		$('#page-container #page').append('<div class="donation-widget enable"><div class="enable_widget">Enable</div></div>');
		$('.enable_widget').off('click').on('click', function(){ toggle_widget(); });
	}

	function toggle_widget(){
		if (localStorage.getItem('YTDC_disable_'+identificator) == 'true'){
			localStorage.setItem('YTDC_disable_'+identificator, 'false');
			run_script();
		} else{
			localStorage.setItem('YTDC_disable_'+identificator, 'true');
			destroy_script();
		}
	}


	/************************************/
	/*   Check if script was disabled   */
	/************************************/

	if (localStorage.getItem('YTDC_disable_'+identificator) == 'true'){
		return show_enable();
	}


	/*********************/
	/*   Wait for chat   */
	/*********************/

	// Observer settings
	var observer = new MutationObserver(function(mutations){
			mutations.forEach(function(mutation){
				if (mutation.addedNodes.length && mutation.addedNodes[0].className == "yt-uix-expander live-chat-expander"){
					observer.disconnect(); // Stop the observer.
					run_script(); // Start the script.
				}
			});
		}),
		observerConfig = {
			childList: true,
			subtree: true
		},
		targetNode = document.body;

	if ($('#all-comments').length) run_script(); // If comments are already loaded, skip the observer.
	else observer.observe(targetNode, observerConfig); // Otherwise set up the observer and wait untill comments load


	/***************************/
	/*   Run the main script   */
	/***************************/

	function run_script(){

		/****************/
		/*   Add HTML   */
		/****************/

		$('.donation-widget.enable').remove();
		var style_pos = (position !== null ? position : ""),
			style_siz = (size !== null ? size : ""),
			html  = '<div class="donation-widget'+(is_pinned == "true" ? " pinned" : "")+'" style="'+style_pos+' '+style_siz+'">';
			html += '<div class="title">Donation messages <span class="pin_widget">Pin</span><span class="remove_widget">Disable</span></div>';
			html += '<div class="donation-messages"></div>';
			html += '</div>';
		$('#page-container #page').append(html);


		/**************************/
		/*   Element definitons   */
		/**************************/

		var $draggable_div = $('.donation-widget .title'),
			$widget = $('.donation-widget'),
			$message_box = $('.donation-messages'),
			$yt_comment_box = $('#all-comments'),
			last_comment_id;


		/****************************/
		/*   Pin/Unpin the widget   */
		/****************************/

		function toggle_pin(){
			$widget.toggleClass('pinned');
			if (is_pinned == 'true'){
				is_pinned = 'false';
				// Fix the off-screen bug when un-pinning the widget
				if ($widget.css('top') != 'auto' && window.innerHeight - parseInt($widget.css('top').replace(/[^0-9\.]/gi, ''), 10) < $draggable_div.height() + 10){
					$widget.css('top', (window.innerHeight - $draggable_div.height() - 10)+'px'); // Change the possition for widget
					position = 'top: '+$widget.css('top')+'; left: '+$widget.css('left')+';';
					localStorage.setItem('YTDC_position_'+identificator, position); // Set the correct position to storage.
				}
			}else{
				is_pinned = 'true';
			}
			localStorage.setItem('YTDC_pinned_'+identificator, is_pinned);
		}


		/**************/
		/*   Events   */
		/**************/

		$widget
		.on('click', '.remove_widget', function(e){
			toggle_widget();
		})
		.on('click', '.pin_widget', function(e){
			toggle_pin();
		})
		// Drag & drop functionality
		.on('mousedown', '.title', function(e){
			if ($(e.target).is('.remove_widget, .pin_widget')) return false;

			e.preventDefault();

			// Fix the mouse position problem
			var Offset = $draggable_div.offset(),
				relX = $draggable_div.width() - (e.pageX - Offset.left) + 20, // Left & right side padding has to be included!
				relY = $draggable_div.height() - (e.pageY - Offset.top) + 10; // Top & bottom padding has to be included!

			// Make the box draggable
			$widget.addClass('draggable').parent().on('mousemove', function(e){
				$('.draggable').offset({
					top: e.pageY - $draggable_div.outerHeight() + relY,
					left: e.pageX - $draggable_div.outerWidth() + relX
				}).on('mouseup', function() {
					position = 'top: '+$widget.css('top')+'; left: '+$widget.css('left')+';';
					localStorage.setItem('YTDC_position_'+identificator, position);
					$widget.removeClass('draggable');
				});
			});
		})
		.on('mouseup', function(){
			$widget.removeClass('draggable');
		})
		// Ability to resize the widget
		.resizable({
			stop: function(event, ui){
				$message_box.perfectScrollbar('update');
				size = 'width: '+$widget.css('width')+'; height: '+$widget.css('height')+';';
				localStorage.setItem('YTDC_size_'+identificator, size);
			}
		});

		$message_box
		.on('click', '.delete_tip_message', function(){
			$(this).closest('.message').remove();
			$message_box.perfectScrollbar('update'); // Update the scroll bar
		})
		.perfectScrollbar();


		/********************/
		/*   Chat monitor   */
		/********************/

		$yt_comment_box.bind('DOMSubtreeModified', function(){
			var $last_comment = $('#all-comments li.comment:last-child');

			// Check is there was actually any new comment posted.
			if ($last_comment.attr('data-id') == last_comment_id) return;
			last_comment_id = $last_comment.attr('data-id');

			if ($last_comment.hasClass('fan-funding-tip')){

				// Get the donation amount
				var $last_comment_content = $last_comment.find('content'),
					tip_text = $.trim($last_comment_content.find('.byline .tip-amount').text()),
					tip_amount = parseInt(tip_text.replace(/[^0-9\.]/gi, ''), 10);

				// If the tip amount is equal or higher than minimum, proceed.
				if (tip_amount >= minimum_donation){

					// Get rest of the data from the comment.
					var message = $.trim($last_comment_content.find('.comment-text').text()),
						message_part1 = message.slice(0, message.length/2).trim(),
						message_part2 = message.slice(message.length/2).trim(),
						author = $.trim($last_comment_content.find('.author .yt-user-name').text()),
						date = new Date(),
						time = ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2) + ":" + ("0" + date.getSeconds()).slice(-2);

					// Check if message has been duplicated, if yes, remove duplicate part.
					if (message_part1 == message_part2) message = message_part1;

					// Generate the html for new donation
					var append  = '<div class="message">';
						append += '<div class="message_info">';
						append += '<span class="message_author">' + author + '</span> | ';
						append += '<span class="message_time">' + time + '</span> | ';
						append += '<span class="message_tip">' + tip_text + '</span>';
						append += '<span class="delete_tip_message"></span>';
						append += '</div>';
						append += '<div class="message_text">' + message + '</div>';
						append += '</div>';
					$message_box.append(append); // Insert the comment to our own message box.
					$message_box.perfectScrollbar('update'); // Update the scroll bar
				}
			}
		});
	}


	/*******************************/
	/*   Destroy the main script   */
	/*******************************/

	function destroy_script(){

		var $widget = $('.donation-widget'),
			$message_box = $('.donation-messages'),
			$yt_comment_box = $('#all-comments');


		/**********************/
		/*   Destroy events   */
		/**********************/

		$('.remove_widget').off();
		$widget.resizable("destroy");
		$message_box.perfectScrollbar('destroy');
		$message_box.off();
		$yt_comment_box.unbind();
		$widget.off();
		$widget.remove();

		// Show enable button
		show_enable();
	}
})();
