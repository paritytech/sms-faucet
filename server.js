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

const ETH_SMS = 5000000000000000000;
const ETH_EMAIL = 500000000000000000;

function rain(who, to) {
	return new Promise(function (resolve, reject) {
		if (!who.match(/^0x[a-f0-9]{40}$/) || !to.match(/^0x[a-f0-9]{40}$/)) {
			return reject('Invalid address.');
		}

		if (banned[who]) {
			return reject('Account banned.');
		}

		if (past[who] && Date.now() - past[who] < 24 * 3600 * 1000) {
			return reject('Faucet draw rate limited. Call back in 24 hours.');
		}

		bondsF.Transform
			.all([sms.certified(who), email.certified(who)])
			.then(([smscert, emailcert]) => {
				if (!smscert && !emailcert) {
					return reject('Account not certified');
				}

				past[who] = Date.now();
				apiK.eth
					.sendTransaction({ from: address, to: to, value: (smscert ? ETH_SMS : 0) + (emailcert ? ETH_EMAIL : 0) })
					.then(tx => resolve('Kovan Ether on its way in transaction', tx))
					.catch(e => reject(`Internal error: ${JSON.stringify(e)}`));
			});
	});
}

app.use(function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	next();
});

app.get('/api/:address', function(req, res) {
	let who = req.params.address.toLowerCase();
	rain(who, who)
		.then(function (result, hash) {
			res.json({ result, hash })
		})
		.catch(function (error) {
			res.json({ error });
		});
});

app.get('/:address', function (req, res) {
	let who = req.params.address.toLowerCase();
	rain(who, who)
		.then(function (result, txHash) {
			if (txHash) {
				res.end(`${result} https://kovan.etherscan.io/tx/${txHash}`);
			} else {
				res.end(result);
			}
		})
		.catch(function (error) {
			res.end(error);
		});
});
/*
app.get('/:address/:to', function (req, res) {
	let who = req.params.address.toLowerCase();
	let to = req.params.to.toLowerCase();
	rain(who, to, res);
});
*/


console.log("Start server...");
var server = app.listen(80, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log("sms-faucet service listening at http://%s:%s", host, port);
});
