######(Chrome-Extension)
# Episode++

Episode++ lets you open the latest episode of a series you have not yet watched.
<!-- detailed description
that can be found on one of the following supported domains:
* netflix (experimental: enter url from first episode)
* youtube playlists
* kinox
* bs.to
* animehaven.to (experimental)
* proxer.me
-->

To edit/add/delete/select a series you have to activate the popup first by double clicking on the extension's icon.

To choose between added series you also can use the dropdown selection in the context menu (right click on the extension's icon).
(Context menu selection only supports 5 series.)

The "Episode — —" option (see context menu) allows you to decrement the episode number of the selected series.

The URLs are not stored in plaintext.

<!-- detailed description
Disclaimer:
Please make sure that the usage of the supported web sites is allowed in your country if you want to use this extension. I don't support illegal use of any services in any kind.
-->

---
![Tutorial](https://raw.githubusercontent.com/alt-13/Episode/master/Tutorial.gif)
---

Sorted by priority:
<!--
## TODOs:
* 5$ for dev acc
-->
#### Resolved Bugs:
* default for incognito (add series) not working

#### Known Bugs:
<!--
#### Issues:
* BS.TO direct link to stream hoster only working if no captcha
* test fragments with options
* context menu update too often?
* storage access reduction?
-->

#### Features:
* [ ] options page:
  * [x] preferred host (streamcloud, ..)
  * [x] open link to stream page directly (bs.to)
  * [x] standard incognito/ or not
  * [x] urls stored plain text (faster)
  * [x] show notification opening URL of unknown host
  * [x] enable autoplay for youtube playlists
  *	[x] icon colour picker
  * [x] theme chooser (dark/light)
  * [ ] do it yourself episode link builder
* [x] select series which are shown in browser action context menu
  * [ ] more than 5 (context menu entries) warning
* [x] "<1st_URL> | <2nd_URL>" support for opening 2 taps simultaneously
<!-- TODO: open piped urls in order (promise at the end of openURL); test all tab ids stuff; chrome.windows.onRemoved; openURL ids stuff-->
* [ ] proxer.me generalisation
* [ ] movie4k
* [ ] tubeplus.is
* [ ] availability for link-building sites to season loop (as in bs.to)
* [ ] PORT FOR FIREFOX
* [ ] end of series hint

<!--
* folder structure and play with embeded web player for *.<video-format> files
* generalize (delete empty path.split elements ("")) refactor background.js
* console easter egg (for hidden functions)
-->

