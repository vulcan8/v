class Curl {
   constructor() {
      this.oauth_consumer_key = "";
      this.oauth_token = "";
      this.consumer_secret = "";
      this.access_token_secret = "";

      this.base_url = "https://www.linkedin.com/voyager/api/${endpoint}$";
   }

   /////////////////////////////////////////////////////////////////
   // METHODS
   /////////////////////////////////////////////////////////////////

   get(endpoint, parameters, headers = false) {
      return this._makeRequest("GET", endpoint, parameters, headers);
   }

   post(endpoint, parameters, headers = false) {
      return this._makeRequest("POST", endpoint, parameters, headers);
   }

   generateHeader() {
      let headers = {};
      headers.oauth_nonce = this._generateNonce();
      headers.oauth_consumer_key = this.oauth_consumer_key;
      headers.oauth_token = this.oauth_token;
      headers.oauth_signature_method = "HMAC-SHA1";
      headers.oauth_timestamp = moment().format("X");
      headers.oauth_version = "1.0";

      return headers;
   }

   generateSignature(http_method, url, url_parameters, header_parameters) {
      http_method = http_method.toUpperCase();

      //Prepare for generating the parameters string
      const parameters = { ...url_parameters, ...header_parameters };
      const parameters_string = this._formatData(parameters, "=", "&", false, true);

      //We create the SIGNATURE BASE STRING
      const encoded_url = this._percentEncode(url);
      const encoded_parameters_string = this._percentEncode(parameters_string);
      const signature_base_string = `${http_method}&${encoded_url}&${encoded_parameters_string}`;

      //Creating the signing key
      const signing_key_string = `${this._percentEncode(this.consumer_secret)}&${this._percentEncode(this.access_token_secret)}`;

      let shaObj = new jsSHA("SHA-1", "TEXT");
      shaObj.setHMACKey(signing_key_string, "TEXT");
      shaObj.update(signature_base_string);
      const hmac = shaObj.getHMAC("B64");

      return hmac;

   }

   /////////////////////////////////////////////////////////////////
   // Formatters, generators and such
   /////////////////////////////////////////////////////////////////

   _generateAuthorizationHeader(headers) {
      let _string = this._formatData(headers, "=", ", ");
      let authorization_header_string = `OAuth ${_string}`;
      return authorization_header_string;
   }

   _makeRequest(http_method, endpoint, parameters, headers = false) {
      return new Promise((resolve, reject) => {
         if(!header){
            headers = this.generateHeader();
         }
         
         //default parameter

         const url = this.base_url.replace('${endpoint}$', endpoint);

         //we generate the signature

         const authorization_string = this._generateAuthorizationHeader(headers);

         const request_data = {
            method: http_method,
            headers: {
               authorization: authorization_string
            },
         };

         let _parameters = this._formatData(parameters, "=", "&", false);
         let request_url = `${url}`;
         if(!!_parameters){
            request_url += `?${_parameters}`;
         }

         fetch(request_url, request_data)
            .then((data) => {
               resolve(data);
            }).catch((err) => {
               reject(err);
            });

      });
   }

   _percentEncode(str) {
      return encodeURIComponent(str).replace(/[!'()*]/g, (c) => {
         return '%' + c.charCodeAt(0).toString(16);
      })
   }

   _generateNonce() {
      let nonce = "";
      let letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for (let i = 0; i < letters.length; i++) {
         nonce += letters.charAt(Math.floor(Math.random() * letters.length));
      }

      return nonce;
   }

   _formatData(parameters, pair_glue, parameters_glue, quote_values = true, sort = false) {
      let parameters_array = [];
      for (let key in parameters) {
         let encoded_key = this._percentEncode(key);
         let encoded_value = "";
         if (quote_values) {
            encoded_value = `"${this._percentEncode(parameters[key])}"`;
         } else {
            encoded_value = this._percentEncode(parameters[key]);
         }
         parameters_array.push([encoded_key, encoded_value]);
      }

      //We sort the array alphabetically
      if (sort) {
         parameters_array.sort((a, b) => {
            if (a[0] > b[0]) return 1;
            if (a[0] < b[0]) return -1;
            if (a[0] === b[0]) { // si ambas keys son iguales, decidimos posicion por value
               if (a[1] > b[1]) return 1;
               if (a[1] < b[1]) return -1;
               return 0;
            }
            return 0;
         });
      }

      //We create the parameters string
      let _temp_array = [];
      parameters_array.forEach((pair) => {
         _temp_array.push(pair.join(pair_glue));
      });
      return _temp_array.join(parameters_glue);
   }

}