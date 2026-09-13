document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-copy]');
  if(!button)return;
  const input=document.getElementById(button.dataset.copy),status=document.getElementById('copy-status');
  if(!input)return;
  try{await navigator.clipboard.writeText(input.value);status.textContent='Copied.';}
  catch{input.focus();input.select();status.textContent='Select and copy the highlighted text.';}
});
