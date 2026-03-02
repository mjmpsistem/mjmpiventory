
const id = '123'; 
const res = await fetch('http://localhost:3000/api/purchase-orders/'+id+'/receive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receivedAt: new Date().toISOString(), suratJalanUrl: 'test' })
});
console.log(await res.json());

