
function displayScreenMessage(text, canClose = false) {
   closeScreenMessage();
   const close_btn = canClose ? `<h3 class="close_screen_message_btn">Close</h3>` : "";
   const messageElement = `
      <div id="ee_crxScreenMessage">
      
      <div class="crxScreenMessage__container">
      <h1>${text}</h1>
      ${close_btn}
      </div>
      
      </div>`;
   if (!!text) {
      $('body').append(messageElement);
      $('body').on('click', '.close_screen_message_btn', () => {
         closeScreenMessage();
      });
   }
}


function closeScreenMessage() {
   const messageElement = document.querySelector('#ee_crxScreenMessage');
   if (messageElement) {
      messageElement.parentElement.removeChild(messageElement);
   }
}

async function async(func) {
   await (func)();
};

class Message {
   constructor() {
   }

   toActivePage(action, value = undefined) {
      return new Promise((resolve, reject) => {
         getActivePage((tabId) => {
            chrome.tabs.sendMessage(tabId, { action, value }, {}, (response) => {
               resolve(response);
            });
         });
      });
   }

   toPage(tabId, action, value = undefined) {
      return new Promise((resolve, reject) => {
         chrome.tabs.sendMessage(tabId, { action, value }, {}, (response) => {
            resolve(response);
         });
      });
   }

   toExtension(action, value = undefined) {
      return new Promise((resolve, reject) => {
         chrome.runtime.sendMessage({ action, value }, {}, (response) => {
            // console.log("tes");
            resolve(response);
         });

      });
   }

   on(callback) {
      chrome.runtime.onMessage.addListener(callback);
   }
}
var message = new Message();

class Storage {
   constructor() {
   }



   get(prefix, keys = false) {
      //prefix, key/keys,
      return new Promise((resolve, reject) => {
         // IF keys false (only prefix provided), we return all entries with prefix
         if (keys === false) {
            let _prefix = this._key(prefix);
            chrome.storage.local.get(null, (st) => {
               let parsed_st = {};
               for (let k in st) {
                  if (k.indexOf(_prefix) === 0) {
                     parsed_st[this._unkey(prefix, k)] = st[k];
                  }
               }
               resolve(parsed_st);
            });
         } else {
            let _keys = keys;
            if (typeof keys === 'string') {
               let prefixed_keys = {};
               const prefixed_key = this._key(prefix, keys);
               prefixed_keys[prefixed_key] = null;
               chrome.storage.local.get(prefixed_keys, (st) => {
                  resolve(st[prefixed_key]);
               });
            } else if (is_array(keys)) {
               let prefixed_keys = {};
               _keys.forEach((k) => {
                  prefixed_keys[this._key(prefix, k)] = null;
               });

               chrome.storage.local.get(prefixed_keys, (st) => {
                  let parsed_st = {};
                  for (let k in st) {
                     let unprefixed_key = this._unkey(prefix, k);
                     parsed_st[unprefixed_key] = st[k];
                  }
                  resolve(parsed_st);
               });
            } else {
               reject("storage.get error: not a valid key type")
            }
         }
      });
   }

   set(prefix, key, value = false) {
      return new Promise((resolve, reject) => {
         // IF only key provided and its an object, we update multiple entries
         if (is_object(key) && value === false) {
            let prefixed_key_values = {};

            for (let k in key) {
               const prefixed_key = this._key(prefix, k);
               prefixed_key_values[prefixed_key] = key[k];
            }

            chrome.storage.local.set(prefixed_key_values, () => {
               chrome.storage.local.get(prefixed_key_values, (st) => {
                  resolve(st);
               })
            });

         } else {
            // IF not, we set for single entry
            let data = {};
            data[this._key(prefix, key)] = value;
            chrome.storage.local.set(data, () => {
               chrome.storage.local.get(data, (st) => {
                  resolve(st);
               })
            });
         }
      });
   }

   update(prefix, key, valueObj) {
      //only for a single data
      return new Promise((resolve, reject) => {
         this.get(prefix, key)
            .then((st) => {
               if (!is_object(st)) {
                  reject("storage.update error: entry to update is not an object");
               } else {
                  let updatedObj = { ...st, ...valueObj };
                  return this.set(prefix, key, updatedObj);
               }
            }).then((st) => {
               resolve(st);
            });

      });
   }

   append(prefix, key, value, override = null) {
      //only for a single data
      return new Promise((resolve, reject) => {

         // custom default for this param
         if (override === null) {
            override = is_object(value);
         }

         this.get(prefix, key).then((entry) => {
            if (is_array(entry) && is_array(value)) {
               // If data to update AND value to add are arrays, we proceed
               let updatedArr = [];
               if (override) {
                  updatedArr = entry;
                  value.forEach((e) => {
                     if (updatedArr.indexOf(e) < 0) {
                        updatedArr.push(e);
                     }
                  });
               } else {
                  updatedArr = entry.concat(value);
               }
               return this.set(prefix, key, updatedArr);

            } else if (is_object(entry) && is_object(value)) {
               // If data to update AND value to add are objects, we proceed
               let updatedObj = {};
               if (override) {
                  updatedObj = { ...entry, ...value };
               } else {
                  updatedObj = { ...value, ...entry };
               }
               return this.set(prefix, key, updatedObj);

            } else {
               reject("storage.append error: entry to append is not the same type as the value");
            }
         }).then((entry) => {
            resolve(entry)
         });
      });
   }

   remove(prefix, key, subkey = undefined) {
      //only for a single data
      return new Promise((resolve, reject) => {

         if (subkey === undefined) {
            // If no subkey was declared, we delete the entry by key
            const db_key = this._key(prefix, key);
            chrome.storage.local.remove(db_key, () => {
               resolve(true);
            });

         } else {
            // If subkey was declared, we delete it from the table
            this.get(prefix, key).then((st) => {
               if (is_array(st)) {
                  let updatedArr = st.filter(x => {
                     return (x === subkey ? false : true);
                  });

                  return this.set(prefix, key, updatedArr);

               } else if (is_object(st)) {
                  let updatedObj = st;
                  delete updatedObj[subkey];

                  return this.set(prefix, key, updatedObj);

               } else {
                  reject("storage.append error: table doesn't have iterable data to remove");
               }
            }).then((st) => {
               resolve(st)
            });

         }
      });
   }

   init(prefix, default_values_obj) {
      let _prefix = this._key(prefix);
      chrome.storage.local.get(null, (st) => {
         for (let k in default_values_obj) {
            const key = this._key(prefix, k);
            if (!(key in st) || st[key] === undefined || st[key] === null) {
               this.set(prefix, k, default_values_obj[k]);
            }
         }
      });

   }

   _key(prefix, key = "") {
      return `#${prefix.toUpperCase()}_${key}`;
   }

   _unkey(prefix, key = "") {
      return key.replace(`#${prefix.toUpperCase()}_`, "");
   }
}

let storage = new Storage();

/* ========================================================================= */
/* GENERAL TOOLS */
/* ========================================================================= */

function uniqueSelector(el) {
   // var result = el.tagName.toLowerCase() + ':eq(' + $(el).index() + ')',
   var result = ':nth-child(' + ($(el).index() + 1) + ')',
      pare = $(el).parent()[0];

   if (pare.tagName !== undefined && pare.tagName !== 'BODY') {
      result = [uniqueSelector(pare), result].join('>');
   }

   return result;
};

function rand(min, max) {
   return Math.floor((Math.random() * ((max + 1) - min)) + min);
}

function getReactPropertyKeys(el) {
   let keys = [];
   for (let k in el) {
      if (k.indexOf('__react') === 0) keys.push(k);
   }
   return keys;
}

function generateAndDownloadCSV(arr) {
   let csv = "";
   arr.forEach((e) => {
      let data = [];
      for (let k in e) {
         data.push(e[k]);
      }
      csv += data.join(",") + "\n";
   });

   downloadString(csv, 'text/csv', 'data.csv');
}

async function printStorage() {
   chrome.storage.local.get(null, (db) => {
      console.log(db);
   });
}

function waitForEl(selector, timeout = 1.2) {
   return new Promise((resolve, reject) => {
      let tries = 0;
      let interval = setInterval(() => {
         console.log(document.querySelectorAll(selector).length, selector);
         if (document.querySelectorAll(selector).length > 0) {
            clearInterval(interval);
            resolve(true);
         } else if (tries >= (10 * timeout)) {
            clearInterval(interval);
            resolve(false);
         } else {
            tries++;
         }
      }, 100);
   });
};

function waitForUrl(url, timeout = 1.2) {
   return new Promise((resolve, reject) => {
      let tries = 0;
      const target_tries = (timeout === false ? undefined : (10 * timeout));
      let interval = setInterval(() => {
         if (window.location.href.indexOf(url) === 0) {
            clearInterval(interval);
            resolve(true);
         } else if (tries >= target_tries) {
            clearInterval(interval);
            resolve(false);
         } else {
            tries++;
         }
      }, 100);
   });
};

function uuid() {
   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
   });
}

function exists(key, obj) {
   if (obj.constructor === Object) {
      return (key in obj);
   } else if (obj.constructor === Array) {
      return (obj.indexOf(key) >= 0);
   } else {
      throw "obj in exists() is not an object/array";
   }
}

function is_array(variable) {
   if (variable.constructor === Array) {
      return true;
   }
   return false;
}

function is_object(variable) {
   if (variable.constructor === Object) {
      return true;
   }
   return false;
}

function getActivePage() {
   return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
         const tabId = tabs[0].id;
         resolve(tabId);
      });
   });
}

function remove_duplicates(arr) {
   return [...new Set(arr)];
}

function abbr(num, fixed = 0) {
   if (num === null) { return null; } // terminate early
   if (num === 0) { return '0'; } // terminate early
   fixed = (!fixed || fixed < 0) ? 0 : fixed; // number of decimal places to show
   var b = (num).toPrecision(2).split("e"), // get power
      k = b.length === 1 ? 0 : Math.floor(Math.min(b[1].slice(1), 14) / 3), // floor at decimals, ceiling at trillions
      c = k < 1 ? num.toFixed(0 + fixed) : (num / Math.pow(10, k * 3)).toFixed(1 + fixed), // divide by power
      d = c < 0 ? c : Math.abs(c), // enforce -0 is 0
      e = d + ['', 'K', 'M', 'B', 'T'][k]; // append power
   return e;
}

function getPercentage(a, b) {
   return (a / b) * 100;
}

function downloadString(text, fileType, fileName) {
   var blob = new Blob([text], { type: fileType });

   var a = document.createElement('a');
   a.download = fileName;
   a.href = URL.createObjectURL(blob);
   a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
   a.style.display = "none";
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);
   setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
}

function isObjEmpty(obj) {
   try {
      let empty = Object.keys(obj).length <= 0;
      return empty;
   } catch (error) {
      return true;
   }
}

function changeFavicon(url) {
   let favicon_url = chrome.extension.getURL(url);
   document.querySelector("link[rel*='icon']").href = favicon_url;
}

/* ========================================================================= */

/* THIS IS A SNIPPER FOR THE EXTENSIONS TAB IN CHROME */
/* THIS IS A SNIPPER FOR THE EXTENSIONS TAB IN CHROME */
/* THIS IS A SNIPPER FOR THE EXTENSIONS TAB IN CHROME */

function extensionsSwitcher() {
   var exts_container = document.querySelector('extensions-manager').shadowRoot.querySelector('cr-view-manager extensions-item-list').shadowRoot.querySelector('.items-container');

   var ext_items = [];

   exts_container.querySelectorAll('extensions-item').forEach((e) => {
      const is_dev = !!e.shadowRoot.querySelector('#source-indicator [aria-label="Unpacked extension"]');
      if (is_dev) {
         ext_items.push(e);
      }
   });

   ext_items.forEach((x) => {
      let icon = x.shadowRoot.querySelector('#icon-wrapper');
      icon.addEventListener('click', (e) => {
         const exts_container = document.querySelector('extensions-manager').shadowRoot.querySelector('cr-view-manager extensions-item-list').shadowRoot.querySelector('.items-container');

         const item = e.currentTarget.getRootNode().host;
         let index = false;
         let container_first_element = exts_container.childNodes[0];

         console.log(exts_container);
         for (let i = 0; i < exts_container.childNodes.length; i++) {
            if (item == exts_container.childNodes[i]) {
               index = i;
               break;
            }
         }

         exts_container.replaceChild(exts_container.childNodes[index], exts_container.childNodes[0]);
         exts_container.insertBefore(container_first_element, exts_container.childNodes[index]);
      });
   });


}