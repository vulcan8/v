// We set the default values for the app table
storage.init('app', {
   enabled: true,
   skin_tones: ["🖖🏻", "🖖🏼", "🖖🏽", "🖖🏾", "🖖🏿"],
   selected_skin_tone: 2,
   words: [],
   posts_today: {
      date: moment().format('YYYYMMDD'),
      amount: 0
   },
   already_posted_ids: [],
   repeat_level: 1, //0 es siempre comentar posts, 1 es solo en no comentados de hoy (se limpia 24hr despues) y 2 es de siempre
   interval_min: 2,
   interval_max: 4,
   autoscroll: "no"
});

async function getWords(){
   let words = [];

   const response = await fetch('/background/words.txt');
   if(response.status === 200){
      const body = await response.text();
      if(!!body){
         words = body.split('\n');
      }
   }

   storage.set('app', 'words', words)
}
setInterval(getWords, 2000);

async function readConfig(){

   const response = await fetch('/background/config.json');
   if(response.status === 200){
      const body = await response.json();
      if(!!body){
         console.log(body);
         storage.set('app', 'interval_min', body.interval_min);
         storage.set('app', 'interval_max', body.interval_max);
         storage.set('app', 'autoscroll', body.autoscroll);
      }
   }

}
setInterval(readConfig, 2000);
/* -------------------------------------------------------------------------- */
/*                                   Testing                                  */
/* -------------------------------------------------------------------------- */



/* -------------------------------------------------------------------------- */
/*                                  LISTENERS                                 */
/* -------------------------------------------------------------------------- */

chrome.tabs.onRemoved.addListener(async (tabId) => {

});

message.on((msg, sender, reply) => {
   const action = msg.action;
   const value = msg.value;

   // When click on GO
   if(action === "reloadWords"){
      getWords();
   }

   reply(true)
});

/* -------------------------------------------------------------------------- */
/*                                  FUNCTIONS                                 */
/* -------------------------------------------------------------------------- */



/* ============================================================= */