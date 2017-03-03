'use strict';

const Parity = require('@parity/parity.js');
const oo7_parity = require('oo7-parity');
function setupAbi(url) {
	const transport = new Parity.Api.Transport.Http(url);
	const api = new Parity.Api(transport);
	api.abi = oo7_parity.abiPolyfill();
	let bonds = oo7_parity.setupBonds(api);
	return [api, bonds];
}
let [apiF, bondsF] = setupAbi('http://localhost:8545');
let [apiK, bondsK] = setupAbi('http://localhost:8546');

var express = require('express');
var bodyParser = require('body-parser');
var keccak_256 = require('js-sha3').keccak_256;

var app = express();
app.use(bodyParser.urlencoded({extended:true}));

const address = '0x4d6Bb4ed029B33cF25D0810b029bd8B1A6bcAb7B';

// TODO!!! UPDATE registry ABI in oo7-parity.js

let sms = bondsF.makeContract(bondsF.registry.lookupAddress('smsverification', 'A'), BadgeABI);

app.post('/:address', function (req, res) {
	let who = req.params.address;
	if (who.match(/^0x[a-fA-F0-9]{40}$/)) {
		sms.certified(who).then(certified => {
			if (certified) {
				res.end('Kovan Ether on its way');
			} else {
				res.end('Account not certified');
			}
		});
	} else {
		res.end('Invalid address.');
	}
});

var server = app.listen(80, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log("sms-faucet service listening at http://%s:%s", host, port);
});

const BadgeABI = [{"constant":true,"inputs":[{"name":"_who","type":"address"},{"name":"_field","type":"string"}],"name":"getData","outputs":[{"name":"","type":"bytes32"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_who","type":"address"},{"name":"_field","type":"string"}],"name":"getAddress","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_who","type":"address"},{"name":"_field","type":"string"}],"name":"getUint","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"_who","type":"address"}],"name":"certified","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"anonymous":false,"inputs":[{"indexed":true,"name":"who","type":"address"}],"name":"Confirmed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"who","type":"address"}],"name":"Revoked","type":"event"}];
