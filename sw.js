// =========================================================================
// SERVICE WORKER - TÔI APP
// =========================================================================

const CACHE_NAME = "toi-app-v2";

const ASSETS = [
    "./",
    "./index.html",
    "./styles.css",
    "./script.js",
    "./manifest.json",
    "./icon.png"
];

// =========================================================================
// TRANG OFFLINE
// =========================================================================

const OFFLINE_PAGE = `
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport"
content="width=device-width,initial-scale=1">

<title>Offline</title>

<style>
body{
font-family:Arial,sans-serif;
display:flex;
justify-content:center;
align-items:center;
height:100vh;
margin:0;
background:#121212;
color:white;
text-align:center;
padding:20px;
}

.box{
max-width:400px;
}

button{
padding:12px 20px;
border:none;
border-radius:10px;
font-size:16px;
cursor:pointer;
background:#FFC107;
}
</style>

</head>

<body>

<div class="box">

<h1>📡 Offline</h1>

<p>
Không có kết nối mạng
</p>

<button onclick="location.reload()">
Thử lại
</button>

</div>

</body>
</html>
`;


// =========================================================================
// INSTALL
// =========================================================================

self.addEventListener("install", event=>{

console.log("[SW] Installing");

event.waitUntil(

(async()=>{

const cache=await caches.open(CACHE_NAME);

await cache.addAll(ASSETS);

await cache.put(
"./offline.html",
new Response(
OFFLINE_PAGE,
{
headers:{
"Content-Type":"text/html"
}
}
)
);

await self.skipWaiting();

})()

);

});


// =========================================================================
// ACTIVATE
// =========================================================================

self.addEventListener("activate",event=>{

console.log("[SW] Activating");

event.waitUntil(

(async()=>{

const keys=await caches.keys();

await Promise.all(

keys.map(key=>{

if(key!==CACHE_NAME){

console.log("Delete:",key);

return caches.delete(key);

}

})

);

await self.clients.claim();

})()

);

});


// =========================================================================
// FETCH
// =========================================================================

self.addEventListener("fetch",event=>{

event.respondWith(

(async()=>{

const cached=await caches.match(
event.request
);

if(cached){

return cached;

}

try{

const response=
await fetch(event.request);

if(
response &&
response.status===200 &&
event.request.method==="GET"
){

const clone=
response.clone();

const cache=
await caches.open(
CACHE_NAME
);

cache.put(
event.request,
clone
);

}

return response;

}
catch{

if(
event.request.mode==="navigate"
){

return caches.match(
"./offline.html"
);

}

return new Response(
"Offline",
{
status:503
}
);

}

})()

);

});


// =========================================================================
// PUSH NOTIFICATION
// =========================================================================

self.addEventListener(
"push",
event=>{

let data={};

try{

if(event.data){

data=
event.data.json();

}

}catch{

data={};

}

const title=
data.title ||
"TÔI";

const options={

body:
data.body ||
"Bạn có thông báo mới",

icon:
"./icon.png",

badge:
"./icon.png",

vibrate:
[200,100,200],

requireInteraction:true,

tag:
data.tag ||
"default"

};

event.waitUntil(

self.registration.showNotification(
title,
options
)

);

});


// =========================================================================
// CLICK NOTIFICATION
// =========================================================================

self.addEventListener(
"notificationclick",
event=>{

event.notification.close();

event.waitUntil(

clients.matchAll({
type:"window"
})

.then(clientList=>{

for(let client of clientList){

if("focus" in client){

return client.focus();

}

}

if(clients.openWindow){

return clients.openWindow(
"./"
);

}

})

);

});


// =========================================================================
// BACKGROUND SYNC
// =========================================================================

self.addEventListener(
"sync",
event=>{

console.log(
"[SW] Sync:",
event.tag
);

if(
event.tag==="sync-reminders"
){

event.waitUntil(

checkReminder()

);

}

});

async function checkReminder(){

console.log(
"[SW] Reminder check"
);

}


// =========================================================================
// MESSAGE
// =========================================================================

self.addEventListener(
"message",
event=>{

if(
event.data &&
event.data.type==="SHOW_NOTIFICATION"
){

self.registration.showNotification(

event.data.title||"TÔI",

{
body:
event.data.body||"",

icon:
"./icon.png"
}

);

}

});


// =========================================================================
// DEBUG
// =========================================================================

self.addEventListener(
"error",
event=>{

console.log(
"[SW ERROR]",
event.message
);

});

self.addEventListener(
"unhandledrejection",
event=>{

console.log(
"[SW PROMISE ERROR]",
event.reason
);

});
