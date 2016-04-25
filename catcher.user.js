// ==UserScript==
// @name         YT donation catcher
// @namespace    https://github.com/MiChAeLoKGB/YouTubeDonationCatcher
// @version      1.22
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

(function() {
	'use strict';


	/****************/
	/*   SETTINGS   */
	/****************/

	var minimum_donation = 5, // Minimum donation ammount ($ = € = £), no currency conversion is done.
		debug = false; // Show debug in console


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


	/*****************/
	/* Include files */
	/*****************/

	var files = '<link href="https://code.jquery.com/ui/1.11.4/themes/smoothness/jquery-ui.css" rel="stylesheet" type="text/css">\n'+
		'<link href="https://cdnjs.cloudflare.com/ajax/libs/jquery.perfect-scrollbar/0.6.10/css/perfect-scrollbar.min.css" rel="stylesheet" type="text/css">\n';

	$('head').append(files);


	/***************/
	/*   Add CSS   */
	/***************/

	var css = '.donation-widget { width: 450px; height: 300px; background-color: #1b1b1b; border: 1px solid black; float: left; color: #ffffff; position: fixed; bottom: 5px; left: 0; z-index: 1010; }'+
		'.donation-widget.pinned { position: absolute; }'+
		'.donation-widget.enable { width: auto; height: auto; padding: 5px; bottom: 0; }'+
		'.enable_widget{ cursor: pointer; }'+
		'.draggable { opacity: 0.7; }'+
		'.donation-widget .title { padding: 5px 10px; height: 20px; cursor: move; }'+
		'.remove_widget, .pin_widget { cursor: pointer; float: right; font-size: 10px; text-transform: uppercase; }'+
		'.pin_widget { margin-left: 10px; }'+
		'.donation-widget.pinned .pin_widget::before { content: "UN"; }'+
		'.donation-messages { position: absolute; left: 0; width: 100%; top: 20px; bottom: 0; border-top: 1px solid #C0C0C0; margin-top: 5px; padding-top: 5px; overflow-y: auto; }'+
		'.message { padding: 5px 10px; border-bottom: 1px solid #292929; background-color: #1b1b1b; }'+
		'.message:nth-child(even) { background-color: #222222; }'+
		'.message_author, .message_time, .message_tip { max-width: 40%; max-width: calc(100% - 200px); display: inline-block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; vertical-align: middle; }'+
		'.message_author { color: #9A9A9A; }'+
		'.message_time { max-width: 70px; }'+
		'.message_tip { max-width: 50px; font-weight: bold; color: #0F9D58; }'+
		'.delete_tip_message { float: right; cursor: pointer; margin-right: 5px; background: no-repeat url(//s.ytimg.com/yts/imgbin/www-hitchhiker-vflVAomqi.webp) 0px -432px; background-size: auto; width: 15px; height: 15px; }'+
		'.ui-resizable-se { right: 0px; bottom: 0px; filter: invert(1); -webkit-filter: invert(1); }';

	$('head').append('<style>'+css+'</style>');


	/*********************/
	/*   Toggle widget   */
	/*********************/

	function show_enable(){
		var html = '<div class="donation-widget enable">'+
			'<div class="enable_widget">Enable</div>'+
			'</div>';
		$('#page-container #page').append(html);
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
		show_enable(); return;
	}


	/*********************/
	/*   Wait for chat   */
	/*********************/

	// Observer settings
	var observer = new MutationObserver(function(mutations) {
		mutations.forEach(function(mutation) {
			if (mutation.addedNodes.length && mutation.addedNodes[0].className == "yt-uix-expander live-chat-expander"){
				observer.disconnect(); // Stop the observer, for performance reasons
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
			html = '<div class="donation-widget'+(is_pinned == "true" ? " pinned" : "")+'" style="'+style_pos+' '+style_siz+'">'+
			'<div class="title">Donation messages <span class="pin_widget">Pin</span><span class="remove_widget">Disable</span></div>'+
			'<div class="donation-messages"></div>'+
			'</div>';
		$('#page-container #page').append(html);


		/**************************/
		/*   Element definitons   */
		/**************************/

		var draggable_div = $('.donation-widget .title'),
			widget = $('.donation-widget'),
			message_box = $('.donation-messages'),
			yt_comment_box = $('#all-comments'),
			last_comment_id;


		/****************************/
		/*   Pin/Unpin the widget   */
		/****************************/

		function toggle_pin(){
			widget.toggleClass('pinned');
			if (is_pinned == "true"){
				localStorage.setItem('YTDC_pinned_'+identificator, 'false'); is_pinned = 'false';
				// Fix the off-screen bug when un-pinning the widget
				if (widget.css('top') != 'auto' && window.innerHeight - parseInt(widget.css('top').replace(/[^0-9\.]/gi, ''), 10) < draggable_div.height() + 10){
					widget.css('top', (window.innerHeight - draggable_div.height() - 10)+'px'); // Change the possition for widget
					localStorage.setItem('YTDC_position_'+identificator, 'top: '+(window.innerHeight - draggable_div.height() - 10)+'px; left: '+widget.css('left')+';'); // Set the correct position to storage.
				}
			}else{
				localStorage.setItem('YTDC_pinned_'+identificator, 'true'); is_pinned = 'true';
			}
		}


		/**************/
		/*   Events   */
		/**************/

		$('.remove_widget').off('click').on('click', function(){ toggle_widget(); });
		$('.pin_widget').off('click').on('click', function(){ toggle_pin(); });
		widget.resizable({
			stop: function(event, ui) {
				message_box.perfectScrollbar('update');
				localStorage.setItem('YTDC_size_'+identificator, 'width: '+widget.css('width')+'; height: '+widget.css('height')+';');
			}
		});
		message_box.perfectScrollbar();

		// Events for elements added after load.
		function changer() {
			$('.delete_tip_message').off('click').on('click', function() {
				$(this).closest('.message').remove();
			});
		}


		/********************/
		/*   Chat monitor   */
		/********************/

		yt_comment_box.bind('DOMSubtreeModified', function() {
			var last_comment = $('#all-comments li.comment:last-child'),
				last_comment_content = $('#all-comments li.comment:last-child .content');

			// Check is there was actually any new comment posted.
			if (last_comment.attr('data-id') == last_comment_id) return;
			last_comment_id = $('#all-comments li.comment:last-child').attr('data-id');

			if (last_comment.hasClass('fan-funding-tip')) {
				// Get the data from last comment posted
				var message = $.trim(last_comment_content.find('.comment-text').text()),
					message_part1 = message.slice(0, message.length/2).trim(),
					message_part2 = message.slice(message.length/2).trim(),
					author = $.trim(last_comment_content.find('.author .yt-user-name').text()),
					date = new Date(),
					time = ("0" + date.getHours()).slice(-2) + ":" + ("0" + date.getMinutes()).slice(-2) + ":" + ("0" + date.getSeconds()).slice(-2),
					tip_text = $.trim(last_comment_content.find('.byline .tip-amount').text()),
					tip_amount = parseInt(tip_text.replace(/[^0-9\.]/gi, ''), 10);

				// Add the message in, only if tip amount is equal or higher than minimum allowed.
				if (tip_amount >= minimum_donation) {
					// Check if message has been duplicated, if yes, remove duplicate part.
					if (message_part1 == message_part2) message = message_part1;
					var remove = '<span class="delete_tip_message"></span>',
						append = '<div class="message">' +
						'<div class="message_info">' +
						'<span class="message_author">' + author + '</span> | ' +
						'<span class="message_time">' + time + '</span> | ' +
						'<span class="message_tip">' + tip_text + '</span>' +
						remove +
						'</div>' +
						'<div class="message_text">' + message + '</div>' +
						'</div>';
					message_box.append(append);
					message_box.perfectScrollbar('update');
					changer();
				}

				if (debug) console.log(time, author, message);
			}
		});


		/**************************/
		/*   Widget drag & drop   */
		/**************************/

		widget.on('mousedown', '.title', function(e) {
			// Fix the mouse position problem
			var Offset = draggable_div.offset(),
				relX = draggable_div.width() - (e.pageX - Offset.left) + 20, // You have to include padding on left & right side!
				relY = draggable_div.height() - (e.pageY - Offset.top) + 10; // You have to include padding on top & bottom!
			// Make the box draggable
			widget.addClass('draggable').parents().on('mousemove', function(e) {
				$('.draggable').offset({
					top: e.pageY - draggable_div.outerHeight() + relY,
					left: e.pageX - draggable_div.outerWidth() + relX
				}).on('mouseup', function() {
					localStorage.setItem('YTDC_position_'+identificator, 'top: '+(e.pageY - draggable_div.outerHeight() + relY)+'px; left: '+(e.pageX - draggable_div.outerWidth() + relX)+'px;');
					widget.removeClass('draggable');
				});
			});
			e.preventDefault();
		}).on('mouseup', function() {
			$('.draggable').removeClass('draggable');
		});
	}


	/*******************************/
	/*   Destroy the main script   */
	/*******************************/

	function destroy_script(){

		var widget = $('.donation-widget'),
			message_box = $('.donation-messages'),
			yt_comment_box = $('#all-comments');


		/**********************/
		/*   Destroy events   */
		/**********************/

		$('.remove_widget').off();
		widget.resizable("destroy");
		message_box.perfectScrollbar('destroy');
		$('.delete_tip_message').off();
		yt_comment_box.unbind();
		widget.off();
		widget.remove();

		// Show enable button
		show_enable();
	}
})();
