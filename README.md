# YouTube Donation Catcher
Catches donations on YouTube stream and shows them in separate chat that can be moved around and resized! Messages can also be manualy removed.


### Instalation

1. Install [Tamper Monkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) (Chrome) or [Grease Monkey](https://addons.mozilla.org/firefox/addon/greasemonkey/) (Firefox).
2. Go to [this url](https://raw.githubusercontent.com/MiChAeLoKGB/YouTubeDonationCatcher/master/catcher.user.js) and install request should show up.
3. Change **minimum_donation** value that will be captured by this script by changing the numeric value on line 25 (marked as **SETTINGS**) of this script from `var minimum_donation = 5,` to `var minimum_donation = 1,` or any number you want.


### Info

- Script works only on https://www.youtube.com url's, and does not work on https://gaming.youtube.com, because gaming version uses chat through iframe from different domain and XSS security will not allow me to read those messages (there is nothing I can do).
- Script can be enabled or disabled for *live dashboard* and *live stream* separately, so you can have it enabled in your dashboard, but disabled for any other parts of youtube.
- Script does not show on videos that are not live (live chat is not on the site).
- Minimum amount setting is 1 to 1, without any exchange rates (1$ = 1€ = 1£). That means, if you set it to 5$, it will ignore donations of 4£, which is actually more than 5$.
- Disabling script will remove html from the page and also all events bound to it, which means, if you had any messages in it, they **will be removed**.
- Chat can be either *pinned* on one specific spot on the page or float on the screen on same spot while scrolling (default).
- Chat can be moved around the site by dragging on the title and resized by dragging its sides or bottom right corner.
- Chats position, size and state (pinned/unpinned) are being saved (independently for dashboard and videos), so you do not have to always position it after reloading the page.


### Screenshot

![Screenshot](https://raw.githubusercontent.com/MiChAeLoKGB/YouTubeDonationCatcher/master/yt_donation_catcher.jpg "Screenshot")
