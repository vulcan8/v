$(document).ready(async () => {
   const url = new URL(window.location.href);
   const id = url.searchParams.get("id");
   let message = "";

   if(id === "false"){
      message = "No emails where found."
   }else{
      const emails = await storage.get('tab', id);
      message = "Extraction successfully completed. Click <a id='download_data'>HERE<a/> to download the extracted data."
   }

   $("#message").html(message);
   $('body').on('click', '#download_data', async () => {
      const data = await storage.get('tab', id);
      generateAndDownloadCSV(data);
   });
});

