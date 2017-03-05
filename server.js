'use strict';

const Parity = require('@parity/parity.js');
const oo7_parity = require('oo7-parity');
function setupAbi(url) {
	const transport = new Parity.Api.Transport.Http(url);
	var api = new Parity.Api(transport);
	api.abi = oo7_parity.abiPolyfill(api);
	let bonds = oo7_parity.setupBonds(api);
	return [api, bonds];
}
let [apiF, bondsF] = setupAbi('http://localhost:8545');
let [apiK, bondsK] = setupAbi('http://localhost:8546');
bondsF.netChain.then(c => console.log(`On network chain ${c}`));

var express = require('express');
var bodyParser = require('body-parser');
var keccak_256 = require('js-sha3').keccak_256;

var app = express();
app.use(bodyParser.urlencoded({extended:true}));

const address = '0x4d6Bb4ed029B33cF25D0810b029bd8B1A6bcAb7B';

// TODO!!! UPDATE registry ABI in oo7-parity.js

const BadgeABI = [{"constant":true,"inputs":[{"name":"_who","type":"address"},{"name":"_field","type":"string"}],"name":"getData","outputs":[{"name":"","type":"bytes32"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_who","type":"address"},{"name":"_field","type":"string"}],"name":"getAddress","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_who","type":"address"},{"name":"_field","type":"string"}],"name":"getUint","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_who","type":"address"}],"name":"certified","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"anonymous":false,"inputs":[{"indexed":true,"name":"who","type":"address"}],"name":"Confirmed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"who","type":"address"}],"name":"Revoked","type":"event"}];
let sms = bondsF.makeContract(bondsF.registry.lookupAddress('smsverification', 'A'), BadgeABI);
let email = bondsF.makeContract(bondsF.registry.lookupAddress('emailverification', 'A'), BadgeABI);

let banned = {
};

let past = {
};

function rain(who, to, res) {
	if (who.match(/^0x[a-f0-9]{40}$/) && to.match(/^0x[a-f0-9]{40}$/)) {
		if (!banned[who]) {
			if (!past[who] || Date.now() - past[who] > 24 * 3600 * 1000) {
				bondsF.Transform.all([sms.certified(who), email.certified(who)]).then(([smscert, emailcert]) => {
					if (smscert || emailcert) {
						past[who] = Date.now();
						apiK.eth.sendTransaction({ from: address, to: to, value: (smscert ? 5000000000000000000 : 0) + (emailcert ? 500000000000000000 : 0) })
							.then(tx => res.end(`Kovan Ether on its way in transaction https://kovan.etherscan.io/tx/${tx}`))
							.catch(e => res.end(`Internal error: ${JSON.stringify(e)}`));
					} else {
						res.end('Account not certified');
					}
				});
			} else {
				res.end('Faucet draw rate limited. Call back in 24 hours.');
			}

		} else {
			res.end('Account banned.');
		}
	} else {
		res.end('Invalid address.');
	}
}

app.get('/:address', function (req, res) {
	let who = req.params.address.toLowerCase();
	rain(who, who, res);
});

app.get('/:address/:to', function (req, res) {
	let who = req.params.address.toLowerCase();
	let to = req.params.to.toLowerCase();
	rain(who, to, res);
});



console.log("Start server...");
var server = app.listen(4080, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log("sms-faucet service listening at http://%s:%s", host, port);
});
