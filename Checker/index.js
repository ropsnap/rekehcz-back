const axios = require('axios'),
		EventEmitter = require('events'),
			{ MongoClient } = require('mongodb'),
				ccjs = require('creditcard.js')

const Card = require('creditcards/card'),
		ccard = Card(['visa']);

var checkerEmitter = new EventEmitter(),
		e = process.env;

function Checker (infosTextArray) {
	
	// defines native class emitters
	this.on = checkerEmitter.on
	this.emit = checkerEmitter.emit

	// makes mongodb client/connector
	this.mongoClient = new MongoClient(e.MONGO_STRING);
	this.mongoClient.connect()

	this.infos = infosTextArray.map(infoText => {
		
		let split = infoText.split('|')

		let parsed = {
			number: split[0],
			month: split[1],
			year: split[2],
			cvv: split[3],
			brand: null,
			bank: null,
			level: null,
			charge: null,
			status: null,
			error: null
		}
		
		parsed.brand = ccjs.getCreditCardNameByNumber(parsed.number)

		// fix 4 digit year, else presume its exact two digits
		if (parsed.year.length === 4) {
			parsed.year = parsed.year.slice(2)
		}

		console.info('parsed.number', parsed.number)
		console.info('parsed.brand', parsed.brand)
		console.info('parsed.month', parsed.month)
		console.info('parsed.year', parsed.year)

		// offline check spetaculum
		// -> online check is when it falls here
		
		const numvalid = ccard.luhn(parsed.number),
			  expvalid = ccjs.isExpirationDateValid(parsed.month, parsed.year),
			  cvcvalid = ccjs.isSecurityCodeValid(parsed.number, parsed.cvv),
			   	pcv = parsed.cvv, // shrotcut
			  cvcvalid2 = Number(pcv[0] + pcv[1] + pcv[2]) > 1;

		console.info('numvalid', numvalid)
		console.info('expvalid', expvalid)
		console.info('cvcvalid', cvcvalid)
		
		// if pass across those 3 ifs
		// it success at all offline tests
		// ...info sintaxe is ok.
		
		if (!numvalid || parsed.brand === 'Credit card is invalid!') {
			parsed.status = 'DEAD'
			parsed.error = 'invalid'
		}

		if (!expvalid) {
			parsed.status = 'DEAD'
			parsed.error = 'expired'
		} 

		if (!cvcvalid || !cvcvalid2) {
			parsed.status = 'DEAD'
			parsed.error = 'invalid_cvc'
		} 

		return parsed;
	})

	this.start = require('./start.js')
	this.storeCheck = require('./storeCheck.js')
	this.checkStored = require('./checkStored.js')
	this.makeToken = require('./makeToken.js')
	this.genpdata = require('./genpdata.js')
	this.resurrectResolve = require('./resurrectResolve.js')
}

Checker.prototype.getBinData = require('./getBinData.js')
Checker.prototype.stripeCharge = require('./stripeCharge.js')
Checker.prototype.changeProxyServerIp = require('./changeProxyServerIp.js')

module.exports = Checker;