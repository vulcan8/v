$(document).ready(async () => {

   const app = await storage.get('app');
   let post_manager = new PostManager();

   if (app.enabled) {
      setInterval(async () => {
         let posts = $('section main section article');
         for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            const id = getPostId(post);

            const already_posted_ids = await storage.get('app', 'already_posted_ids');
            if (already_posted_ids.indexOf(id) === -1) {
               post_manager.addToPile(post);
            }
         }
      }, 400);
   }

});

function _postComment(postElement, comment) {
   var scriptElement = document.createElement("script");

   let codeString = `
   (() => {
      function getReactPropertyKeys(el) {
         let keys = [];
         for (let k in el) {
            if (k.indexOf('__react') === 0) keys.push(k);
         }
         return keys;
      }

      function getFirstNonFalseIndex(arr) {
         for (let i = 0; i < arr.length; i++) {
            if (!!arr[i]) {
               return i;
            }
         }
      }
      
      let textarea = document.querySelector("body>${uniqueSelector(postElement)}").querySelector('form[method="POST"] textarea');
      const k = getReactPropertyKeys(textarea);
      
      const i = getFirstNonFalseIndex(textarea.parentElement.parentElement.parentElement[k[1]].children);
      
      textarea.parentElement.parentElement.parentElement[k[1]].children[i]._owner.stateNode.state.pendingComment = \`${comment}\`;
      textarea.parentElement.parentElement.parentElement[k[1]].children[i]._owner.stateNode.$PostCommentInput3({ preventDefault: function () { } });
   })();
   `;

   scriptElement.innerHTML = codeString;
   document.head.appendChild(scriptElement);
}

function getFirstNonFalseIndex(arr) {
   for (let i = 0; i < arr.length; i++) {
      if (!!arr[i]) {
         return i;
      }
   }
}

function postComment(postElement, comment) {
   return new Promise((resolve, reject) => {
      let textarea = postElement.querySelector('form[method="POST"] textarea');
      const k = getReactPropertyKeys(textarea);

      console.log(k, textarea.parentElement.parentElement.parentElement);
      const i = getFirstNonFalseIndex(textarea.parentElement.parentElement.parentElement[k[1]].children);

      textarea.parentElement.parentElement.parentElement[k[1]].children[i]._owner.stateNode.state.pendingComment = comment;
      textarea.parentElement.parentElement.parentElement[k[1]].children[i]._owner.stateNode.$PostCommentInput3({ preventDefault: function () { } });

      let tries = 0;
      let interval = setInterval(() => {
         const pendingComment = textarea.parentElement.parentElement.parentElement[k[1]].children[i]._owner.stateNode.state.pendingComment;
         if (pendingComment === "") {
            clearInterval(interval);
            resolve(true);
         } else if (tries >= 70) {
            clearInterval(interval);
            resolve(false);
         } else {
            tries++;
         }
      }, 100);
   });
}

function getPostId(postElement) {
   const post_url = postElement.querySelector('time').parentElement.href;
   const regex = /https:\/\/www\.instagram\.com\/p\/([\d\w-_]+)\//gi;
   const results = regex.exec(post_url);
   return results[1];
}

class PostManager {
   constructor() {
      this.pile = [];
      this.processing = false;
   }

   addToPile(element) {
      if (this.pile.indexOf(element) === -1) {
         this.pile.push(element);

         if (!this.processing) {
            this.processPile();
         }
      }
   }

   async processPile() {
      if (this.pile.length === 0) {
         this.processing = false;
         return;
      } else {
         this.processing = true;
      }

      const today = moment().format('YYYYMMDD');
      const posts_today_db = await storage.get('app', 'posts_today')

      let should_post = false;
      if (today === posts_today_db.date) {
         if (posts_today_db.amount < 80) {
            should_post = true;
         }
      } else {
         await storage.set('app', 'posts_today', { date: moment().format('YYYYMMDD'), amount: 0 });
         should_post = true;
      }

      if (should_post) {
         const post = this.pile[0];

         const app = await storage.get('app');

         const should_post_hashtag = (app.posts_today.amount % 10 === 0) && app.posts_today.amount > 0;
         const emoji = app.skin_tones[app.selected_skin_tone];
         const emojis = `${emoji}`.repeat(rand(1, 8));
         
         let hashtag = "";
         if(should_post_hashtag && app.words.length > 0){
            hashtag = " #" + app.words[rand(0, app.words.length - 1)];
         }

         const comment = `${emojis}${hashtag}`;

         await new Promise((resolve, reject) => {
            setTimeout(() => {
               try {
                  const scroll = window.scrollY;
                  _postComment(post, comment);

                  if(app.autoscroll === "no"){
                     window.scrollTo(0, scroll);
                  }
                  console.log("posted", post);
                  resolve(true);
               } catch (error) {
                  console.log(error);
                  resolve(true);
               }
            }, rand(app.interval_min, app.interval_max) * 1000);
         });

         const id = getPostId(post);
         await storage.update('app', 'posts_today', { amount: app.posts_today.amount + 1 });
         const posted_ids = await storage.append('app', 'already_posted_ids', [id], true);

      }

      this.pile.shift();
      this.processPile();

   }
}