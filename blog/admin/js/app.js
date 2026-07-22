// بيانات الدخول (غيّرها لاحقًا)
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "forsah123";

const form = document.getElementById("loginForm");

if (form) {

form.addEventListener("submit", function(e){

e.preventDefault();

const username = document.getElementById("username").value.trim();

const password = document.getElementById("password").value.trim();

const message = document.getElementById("message");

if(username === ADMIN_USERNAME && password === ADMIN_PASSWORD){

message.style.color = "green";
message.innerHTML = "✅ تم تسجيل الدخول...";

setTimeout(function(){

window.location.href = "dashboard.html";

},800);

}else{

message.style.color = "red";
message.innerHTML = "❌ اسم المستخدم أو كلمة المرور غير صحيحة";

}

});

}
