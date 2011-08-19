/**
 *  Get a archive from the server, ask for the one in twapperSession.selectedArchive.
 * - don't ask for the archive it is already present, but 
 *   check if it is this time a search
 * - transform the slider form element into a progress bar.
 * - check if the result has no messages included
 */
function showArchivePageHandler(event){
  console.log("FUCK XOYU");
  
  console.log("event",event, "$(this)",$(this));
  buildPage2("testPage", "testContainer", "Test", "margin: 0px auto; width: 320px; height: 400px; border: none;");
  //$.mobile.changePage("#testPage");
  /*
  // First run result in undefied != some-id, so always true.
  $.mobile.showPageLoadingMsg();
    updateMsgTotal("-");
    setArchiveInfo(null, $('#archive_info'));
    $('#geoMarkerCount').text("-");
    $('#archiveLinksCount').text("-");
    $('#archiveHashtagsCount').text("-");
    $('#archiveMentionsCount').text("-");
    $('#archiveUsersCount').text("-");
    */
    /* The slider is not used at the Moment
    $('#downloadSliderBox').show();
    $('#downloadSlider').val(0).slider("refresh");
    $('#downloadSliderBox').find('input[type="number"]').hide();
    */

}
