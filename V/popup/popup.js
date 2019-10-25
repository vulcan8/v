$(document).ready(() => {

   const manifest = chrome.runtime.getManifest();
   $('#ext-title').html(manifest.name);

   /* -------------------------------------------------------------------------- */
   /*                            Tab buttons behavior                            */
   /* -------------------------------------------------------------------------- */
   function toggleTabs() {
      $('.tab').hide();
      const active_tab = $('.tab-btn.uk-active').attr('tab');
      $(`.tab-${active_tab}`).show();
   }
   toggleTabs();

   $('body').on('click change', 'li.tab-btn', () => {
      toggleTabs();
   });

   /* -------------------------------------------------------------------------- */
   /*                                 Data change                                */
   /* -------------------------------------------------------------------------- */

   chrome.storage.onChanged.addListener(() => {
      updatePopup();
   });
   updatePopup();

   let app = undefined;

   async function updatePopup() {
      app = await storage.get('app');

      $('#enable_extension_opt').attr('checked', app.enabled);

      const skin_tone_index = app.selected_skin_tone;
      const emoji = app.skin_tones[skin_tone_index];
      $('#skin_tone_opt').val(skin_tone_index);
      $('#emoji').html(emoji);

      return true;
   }

   $('body').on('change input', '#skin_tone_opt', (e) => {
      const skin_tone = $(e.currentTarget).val();
      storage.set('app', 'selected_skin_tone', skin_tone);
   });

   $('body').on('change click', '#enable_extension_opt', (e) => {
      storage.set('app', 'enabled', e.currentTarget.checked);
   });

});