
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
function toggleMenu(){const n=$('#navlinks');if(n)n.classList.toggle('open')}
document.addEventListener('click',e=>{if(e.target.closest('[data-menu-toggle]'))toggleMenu();if(e.target.closest('#navlinks a'))$('#navlinks')?.classList.remove('open')});
$$('[data-year]').forEach(n=>n.textContent=new Date().getFullYear());
function showNotice(el,msg,type='success'){if(!el)return;el.textContent=msg;el.className=`notice show ${type}`;}
function getApi(path){return `${window.SP_API_BASE_URL}${path}`;}
async function apiRequest(path,options={}){const res=await fetch(getApi(path),{...options,credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})}});let data={};try{data=await res.json()}catch{}if(!res.ok)throw new Error(data.message||'Request could not be completed. Please try again.');return data;}
const contact=$('#contactForm');
if(contact)contact.addEventListener('submit',async e=>{
 e.preventDefault();const notice=$('#contactNotice');const data=Object.fromEntries(new FormData(contact).entries());
 if(!data.name||!data.email||!data.message){showNotice(notice,'Please complete your name, email and message.','error');return;}
 const btn=$('button[type="submit"]',contact);btn.disabled=true;btn.textContent='Sending…';
 try{
   const response=await fetch('https://formsubmit.co/ajax/harshjaju07@gmail.com',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({_subject:`Sparsh Portfolio enquiry — ${data.service||'General'}`,...data})});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||result.success===false)throw new Error('Email service did not confirm delivery. You can still contact us on WhatsApp.');
   showNotice(notice,'Your email enquiry was accepted by the email service. WhatsApp will open so you can also send the details directly.','success');
   const msg=`Hello Sparsh Portfolio,%0AName: ${encodeURIComponent(data.name)}%0AEmail: ${encodeURIComponent(data.email)}%0APhone: ${encodeURIComponent(data.phone||'Not provided')}%0AService: ${encodeURIComponent(data.service||'General')}%0AMessage: ${encodeURIComponent(data.message)}`;
   window.open(`https://wa.me/918302491321?text=${msg}`,'_blank','noopener');
   contact.reset();
 }catch(err){
   showNotice(notice,err.message+' WhatsApp contact: +91 8302491321.','error');
 }finally{btn.disabled=false;btn.textContent='Send enquiry →';}
});
const authForm=$('[data-auth-form]');
if(authForm)authForm.addEventListener('submit',async e=>{
 e.preventDefault();const notice=$('#formNotice');const formData=Object.fromEntries(new FormData(authForm).entries());const action=authForm.dataset.authForm;
 if(action==='signup'&&formData.password!==formData.confirmPassword){showNotice(notice,'Passwords do not match.','error');return;}
 const endpoints={signup:'/auth/register',signin:'/auth/login',forgot:'/auth/forgot-password'};
 const payload=action==='signup'?{fullName:formData.fullName,email:formData.email,phone:formData.phone,password:formData.password}:action==='signin'?{email:formData.email,password:formData.password}:{email:formData.email};
 try{const out=await apiRequest(endpoints[action],{method:'POST',body:JSON.stringify(payload)});showNotice(notice,out.message||'Request completed.','success');if(action==='signin')setTimeout(()=>location.href=new URLSearchParams(location.search).get('next')||'dashboard.html',700);if(action==='signup')setTimeout(()=>location.href='signin.html',900);}
 catch(err){showNotice(notice,err.message.includes('Failed to fetch')?'The account service is not connected yet. The backend will be deployed in Phase 2.':err.message,'error');}
});
const booking=$('#bookingForm');
if(booking)booking.addEventListener('submit',async e=>{
 e.preventDefault();const notice=$('#bookingNotice');const data=Object.fromEntries(new FormData(booking).entries());
 try{const out=await apiRequest('/bookings',{method:'POST',body:JSON.stringify(data)});showNotice(notice,`Booking received. Reference: ${out.reference||'created'}`,'success');booking.reset();}
 catch(err){showNotice(notice,err.message.includes('Failed to fetch')?'Booking API is not connected yet. Sign-in and booking will become active after Phase 2 backend deployment.':err.message,'error');}
});
const dash=$('#dashboardContent');
if(dash){apiRequest('/users/me').then(user=>{dash.innerHTML=`<h2>Welcome, ${escapeHtml(user.fullName||'Customer')}</h2><p class="muted">Your account is connected.</p>`;return apiRequest('/bookings/mine')}).then(data=>{const list=$('#bookingList');if(list)list.innerHTML=(data.bookings||[]).map(b=>`<article class="card"><b>${escapeHtml(b.service||'Service request')}</b><p>Reference: ${escapeHtml(b.reference||'—')} · Status: ${escapeHtml(b.status||'Pending')}</p></article>`).join('')||'<p class="muted">No bookings yet.</p>'}).catch(()=>{dash.innerHTML='<p class="muted">Customer dashboard will become available after the backend is deployed and you sign in.</p>';});}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
$$('[data-logout]').forEach(btn=>btn.addEventListener('click',async()=>{try{await apiRequest('/auth/logout',{method:'POST',body:'{}'})}catch{}location.href='index.html'}));
