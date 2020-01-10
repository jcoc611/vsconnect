import { BufferIO } from "./BufferIO";
import { IHeader } from "./interfaces";

// Based on https://github.com/song940/node-dns
// Node-dns with Copyright (c) 2016 lsong - MIT License

const BufferReader = require('./lib/reader');
const BufferWriter = require('./lib/writer');


/**
 * [Header description]
 * @param {[type]} options [description]
 * @docs https://tools.ietf.org/html/rfc1035#section-4.1.1
 */
class DnsHeader {
	/**
	 * [parse description]
	 * @param  {[type]} buffer [description]
	 * @return {[type]}        [description]
	 * @docs https://tools.ietf.org/html/rfc1035#section-4.1.1
	 */
	static parse(io: BufferIO): IHeader {
		let header: IHeader = {
			id     : io.readUInt(16),
			qr     : Boolean( io.readUInt(1) ),
			opcode : io.readUInt(4),
			aa     : Boolean( io.readUInt(1) ),
			tc     : Boolean( io.readUInt(1) ),
			rd     : Boolean( io.readUInt(1) ),
			ra     : Boolean( io.readUInt(1) ),
			z      : io.readUInt(3) && 0,
			rcode  : io.readUInt(4),
			qdcount: io.readUInt(16),
			ancount: io.readUInt(16),
			nscount: io.readUInt(16),
			arcount: io.readUInt(16),
		};

		return header;
	};
  
  /**
   * [toBuffer description]
   * @return {[type]} [description]
   */
  Packet.Header.prototype.toBuffer = function(writer){
	writer = writer || new Packet.Writer();
	writer.write(this.id     , 16)
	writer.write(this.qr     , 1)
	writer.write(this.opcode , 4)
	writer.write(this.aa     , 1)
	writer.write(this.tc     , 1)
	writer.write(this.rd     , 1)
	writer.write(this.ra     , 1)
	writer.write(this.z      , 3)
	writer.write(this.rcode  , 4)
	writer.write(this.qdcount, 16)
	writer.write(this.ancount, 16)
	writer.write(this.nscount, 16)
	writer.write(this.arcount, 16)
	return writer.toBuffer();
  };

/**
 * [Packet description]
 * @param {[type]} data [description]
 * @docs https://tools.ietf.org/html/rfc1034
 * @docs https://tools.ietf.org/html/rfc1035
 *
 * <Buffer 29 64 01 00 00 01 00 00 00 00 00 00 
 *       |-ID----------- HEADER ----------->|
 *
 *  03 77 77 77 01 7a 02 63 6e 00 00 01 00 01>
 *   <-W--W--W-----Z-----C--N>|<----------->|
 */
export class DnsMessage {

	/**
	 * [uuid description]
	 * @return {[type]} [description]
	 */
	static uuid(): number{
		return Math.floor(Math.random() * 1e5);
	};

	static fromBuffer(buffer: Buffer): DnsMessage {
		let packet = new DnsMessage();
		let reader = new BufferIO(buffer);
		packet.header = DnsHeader.parse(reader);
		// ([ // props             parser              count
		// 	[ 'questions'   , Packet.Question, packet.header.qdcount ],
		// 	[ 'answers'     , Packet.Resource, packet.header.ancount ],
		// 	[ 'authorities' , Packet.Resource, packet.header.nscount ],
		// 	[ 'additionals' , Packet.Resource, packet.header.arcount ]
		// ]).forEach(function(def){
		// 	var section = def[0];
		// 	var decoder = def[1];
		// 	var count   = def[2];
		// 	while(count--){
		// 	try{
		// 		packet[ section ] = packet[ section ] || [];
		// 		packet[ section ].push( decoder.parse(reader) );
		// 	}catch(e){
		// 		console.error('node-dns > parse %s error:', section, e.message);
		// 	}
		// 	}
		// });
		return packet;
	};

	/**
	 * [toBuffer description]
	 * @return {[type]} [description]
	 */
	toBuffer(){
		let writer = Packet.Writer();
		this.header.qdcount = this.questions  .length;
		this.header.ancount = this.answers    .length;
		this.header.nscount = this.authorities.length;
		this.header.arcount = this.additionals.length;
		if(!(this instanceof Packet.Header))
		this.header = new Packet.Header(this.header);
		this.header.toBuffer(writer);
		;([ // section          encoder
		[ 'questions'  , Packet.Question ],
		[ 'answers'    , Packet.Resource ],
		[ 'authorities', Packet.Resource ],
		[ 'additionals', Packet.Resource ],
		]).forEach(function(def){
		var section   = def[0];
		var Encoder   = def[1];
		(this[ section ] || []).map(function(resource){
			return Encoder.encode(resource, writer);
		});
		}.bind(this));
		return writer.toBuffer();
	};

	constructor() {
		this.header      = {};
		this.questions   = [];
		this.answers     = [];
		this.authorities = [];
		this.additionals = [];
		// if(data instanceof Packet){
		// 	return data;
		// } else if(data instanceof Packet.Header){
		// 	this.header = data;
		// } else if(data instanceof Packet.Question){
		// 	this.questions.push(data);
		// } else if(data instanceof Packet.Resource){
		// 	this.answers.push(data);
		// } else if(typeof data === 'string'){
		// 	this.questions.push(data);
		// } else if(typeof data === 'object'){
		// 	var type = ({}).toString.call(data).match(/\[object (\w+)\]/)[1];
		// 	if(type === 'Array'){
		// 	this.questions = data;
		// 	}
		// 	if(type === 'Object'){
		// 	this.header = data;
		// 	}
		// }
	};
};

/**
 * [QUERY_TYPE description]
 * @type {Object}
 * @docs https://tools.ietf.org/html/rfc1035#section-3.2.2
 */
Packet.TYPE = {
  A     : 0x01,
  NS    : 0x02,
  MD    : 0x03,
  MF    : 0x04,
  CNAME : 0x05,
  SOA   : 0x06,
  MB    : 0x07,
  MG    : 0x08,
  MR    : 0x09,
  NULL  : 0x0A,
  WKS   : 0x0B,
  PTR   : 0x0C,
  HINFO : 0x0D,
  MINFO : 0x0E,
  MX    : 0x0F,
  TXT   : 0x10,
  AAAA  : 0x1C,
  SPF   : 0x63,
  AXFR  : 0xFC,
  MAILB : 0xFD,
  MAILA : 0xFE,
  ANY   : 0xFF,
  CAA   : 0x101,
};
/**
 * [QUERY_CLASS description]
 * @type {Object}
 * @docs https://tools.ietf.org/html/rfc1035#section-3.2.4
 */
Packet.CLASS = {
  IN : 0x01,
  CS : 0x02,
  CH : 0x03,
  HS : 0x04,
  ANY: 0xFF
};




/**
 * Question section format
 * @docs https://tools.ietf.org/html/rfc1035#section-4.1.2
 */
Packet.Question = function(name, type, cls){
  var defaults = {
    type : Packet.TYPE .ANY,
    class: Packet.CLASS.ANY
  };
  if(typeof name === 'object'){
    for(var k in name)
      this[ k ] = name[k] || defaults[k];
  } else {
    this.name = name;
    this.type = type || defaults.type;
    this.class = cls || defaults.class;
  }
  return this;
};

/**
 * [toBuffer description]
 * @param  {[type]} writer [description]
 * @return {[type]}        [description]
 */
Packet.Question.prototype.toBuffer = function(writer){
  return Packet.Question.encode(this, writer);
};

/**
 * [parse description]
 * @param  {[type]} reader [description]
 * @return {[type]}        [description]
 */
Packet.Question.parse = 
Packet.Question.decode = function(reader){
  var question = new Packet.Question();
  if(reader instanceof Buffer){
    reader = new Packet.Reader(reader);
  }
  question.name = Packet.Name.decode(reader);
  question.type = reader.read(16);
  question.class= reader.read(16);
  return question;
};

Packet.Question.encode = function(question, writer){
  writer = writer || new Packet.Writer();
  Packet.Name.encode(question.name, writer);
  writer.write(question.type,  16);
  writer.write(question.class, 16);
  return writer.toBuffer();
};

/**
 * Resource record format
 * @docs https://tools.ietf.org/html/rfc1035#section-4.1.3
 */
Packet.Resource = function(name, type, cls, ttl){
  var defaults = {
    name : '',
    ttl  : 300,
    type : Packet.TYPE .ANY,
    class: Packet.CLASS.ANY
  };
  if(typeof name === 'object'){
    for(var k in name)
      this[ k ] || name[k] || defaults[k];
  } else {
    this.name  = name || defaults.name;
    this.type  = type || defaults.type;
    this.ttl   = ttl  || defaults.ttl;
    this.class = cls  || defaults.class;
  }
  return this;
};

/**
 * [toBuffer description]
 * @param  {[type]} writer [description]
 * @return {[type]}        [description]
 */
Packet.Resource.prototype.toBuffer = function(writer){
  return Packet.Resource.encode(this, writer);
};

/**
 * [encode description]
 * @param  {[type]} resource [description]
 * @param  {[type]} writer   [description]
 * @return {[type]}          [description]
 */
Packet.Resource.encode = function(resource, writer){
  writer = writer || new Packet.Writer();
  Packet.Name.encode(resource.name, writer);
  writer.write(resource.type,  16);
  writer.write(resource.class, 16);
  writer.write(resource.ttl,   32);
  var encoder = Object.keys(Packet.TYPE).filter(function(type){
    return resource.type == Packet.TYPE[ type ];
  })[0];
  if(encoder in Packet.Resource && Packet.Resource[ encoder ].encode){
    return Packet.Resource[ encoder ].encode(resource, writer);
  } else {
    console.error('node-dns > unknown encoder %s(%j)', encoder, resource.type);
  }
};
/**
 * [parse description]
 * @param  {[type]} reader [description]
 * @return {[type]}        [description]
 */
Packet.Resource.parse = 
Packet.Resource.decode = function(reader){
  if(reader instanceof Buffer){
    reader = new Packet.Reader(reader);
  }
  var resource = new Packet.Resource();
  resource.name  = Packet.Name.decode(reader);
  resource.type  = reader.read(16);
  resource.class = reader.read(16);
  resource.ttl   = reader.read(32);
  var length     = reader.read(16);
  var parser = Object.keys(Packet.TYPE).filter(function(type){
    return resource.type === Packet.TYPE[ type ];
  })[0];
  if(parser in Packet.Resource){
    resource = Packet.Resource[ parser ].decode.call(resource, reader, length);  
  } else {
    console.error('node-dns > unknown parser type: %s(%j)', parser, resource.type);
    var arr = [];
    while(length--) arr.push(reader.read(8));
    resource.data = Buffer.from(arr);
  }
  return resource;
};

/**
 * [encode_name description]
 * @param  {[type]} domain [description]
 * @return {[type]}        [description]
 */
Packet.Name = {
  COPY: 0xc0,
  decode: function(reader){
    if(reader instanceof Buffer){
      reader = new Packet.Reader(reader);
    }
    var name = [], o, len = reader.read(8);
    while(len){
      if((len & Packet.Name.COPY) === Packet.Name.COPY){
        len -= Packet.Name.COPY;
        len = len << 8;
        var pos = len + reader.read(8);
        if(!o) o = reader.offset;
        reader.offset = pos * 8;
        len = reader.read(8);
        continue;
      } else {
        var part = '';
        while(len--) part += String.fromCharCode(reader.read(8));
        name.push(part);
        len = reader.read(8);
      }
    }
    if(o) reader.offset = o;
    return name.join('.');
  },
  encode: function(domain, writer){
    writer = writer || new Packet.Writer();
    // TODO: domain name compress
    (domain || '').split('.').filter(function(part){
      return !!part;
    }).map(function(part){
      writer.write(part.length, 8);
      part.split('').map(function(c){
        writer.write(c.charCodeAt(0), 8);
        return c.charCodeAt(0)
      });
    });
    writer.write(0, 8);
    return writer.toBuffer();
  }
};

/**
 * [A description]
 * @type {Object}
 * @docs https://tools.ietf.org/html/rfc1035#section-3.4.1
 */
Packet.Resource.A = function(address){
  this.type  = Packet.TYPE.A;
  this.class = Packet.CLASS.IN;
  this.address = address;
  return this;
};

Packet.Resource.A.encode = function(record, writer){
  writer = writer || new Packet.Writer();
  var parts = record.address.split('.');
  writer.write(parts.length, 16);
  parts.forEach(function(part){
    writer.write(parseInt(part, 10), 8);
  });
  return writer.toBuffer();
};

Packet.Resource.A.decode = function(reader, length){
  var parts = [];
  while(length--) parts.push(reader.read(8));
  this.address = parts.join('.');
  return this;
};

/**
 * [MX description]
 * @param {[type]} exchange [description]
 * @param {[type]} priority [description]
 * @docs https://tools.ietf.org/html/rfc1035#section-3.3.9
 */
Packet.Resource.MX = function(exchange, priority){
  this.type = Packet.TYPE.MX;
  this.class = Packet.CLASS.IN;
  this.exchange = exchange;
  this.priority = priority;
  return this;
}
/**
 * [encode description]
 * @param  {[type]} record [description]
 * @param  {[type]} writer [description]
 * @return {[type]}        [description]
 */
Packet.Resource.MX.encode = function(record, writer){
  writer = writer || new Packet.Writer();
  var len = Packet.Name.encode(record.exchange).length;
  writer.write(len + 2, 16);
  writer.write(record.priority, 16);
  Packet.Name.encode(record.exchange, writer);
  return writer.toBuffer();
}
/**
 * [decode description]
 * @param  {[type]} reader [description]
 * @param  {[type]} length [description]
 * @return {[type]}        [description]
 */
Packet.Resource.MX.decode = function(reader, length){
  this.priority = reader.read(16);
  this.exchange = Packet.Name.decode(reader);
  return this; 
};
/**
 * [AAAA description]
 * @type {Object}
 * @docs https://en.wikipedia.org/wiki/IPv6
 */
Packet.Resource.AAAA = {
  decode: function(reader, length){
    var parts = [];
    while(length){
      length-=2;
      parts.push(reader.read(16));
    };
    this.address = parts.map(function(part){
      return part > 0 ? part.toString(16) : '';
    }).join(':');
    return this;
  },
  encode: function(record, writer){
    writer = writer || new Packet.Writer();
    var parts = record.address.split(':');
    writer.write(parts.length * 2, 16);
    parts.forEach(function(part){
      writer.write(parseInt(part, 16), 16);
    });
    return writer.toBuffer();
  }
};
/**
 * [NS description]
 * @type {Object}
 * @docs https://tools.ietf.org/html/rfc1035#section-3.3.11
 */
Packet.Resource.NS = {
  decode: function(reader, length){
    this.ns = Packet.Name.decode(reader);
    return this;
  },
  encode: function(record, writer){
    writer = writer || new Packet.Writer();
    writer.write(Packet.Name.encode(record.ns).length, 16);
    Packet.Name.encode(record.ns, writer);
    return writer.toBuffer();
  }
};
/**
 * [CNAME description]
 * @type {Object}
 * @docs https://tools.ietf.org/html/rfc1035#section-3.3.1
 */
Packet.Resource.CNAME = {
  decode: function(reader, length){
    this.domain = Packet.Name.decode(reader);
    return this;
  },
  encode: function(record, writer){
    writer = writer || new Packet.Writer();
    writer.write(Packet.Name.encode(record.domain).length, 16);
    Packet.Name.encode(record.domain, writer);
    return writer.toBuffer();
  }
};
/**
 * [SPF description]
 * @type {[type]}
 * @docs https://tools.ietf.org/html/rfc1035#section-3.3.14
 */
Packet.Resource.SPF =
Packet.Resource.TXT = {
  decode: function(reader, length){
    var parts = [];
    length = reader.read(8); // text length
    while(length--) parts.push(reader.read(8));
    this.data = Buffer.from(parts).toString('utf8');
    return this;
  },
  encode: function(record, writer){
    writer = writer || new Packet.Writer();
    var buffer = Buffer.from(record.data, 'utf8');
    writer.write(buffer.length + 1, 16); // response length
    writer.write(buffer.length, 8); // text length
    buffer.forEach(function(c){
      writer.write(c, 8);
    });
    return writer.toBuffer();
  }
};
/**
 * [SOA description]
 * @type {Object}
 * @docs https://tools.ietf.org/html/rfc1035#section-3.3.13
 */
Packet.Resource.SOA = {
  decode: function(reader, length){
    this.primary    = Packet.Name.decode(reader);
    this.admin      = Packet.Name.decode(reader);
    this.serial     = reader.read(32);
    this.refresh    = reader.read(32);
    this.retry      = reader.read(32);
    this.expiration = reader.read(32);
    this.minimum    = reader.read(32);
    return this;
  },
  encode: function(record, writer){
    writer = writer || new Packet.Writer();
    var len = 0;
    len += Packet.Name.encode(record.primary).length;
    len += Packet.Name.encode(record.admin).length;
    len += (32 * 5) / 8;
    writer.write(len, 16);
    Packet.Name.encode(record.primary, writer);
    Packet.Name.encode(record.admin, writer);
    writer.write(record.serial    , 32);
    writer.write(record.refresh   , 32);
    writer.write(record.retry     , 32);
    writer.write(record.expiration, 32);
    writer.write(record.minimum   , 32);
    return writer.toBuffer();
  }
};
/**
 * [SRV description]
 * @type {Object}
 * @docs https://tools.ietf.org/html/rfc2782
 */
Packet.Resource.SRV = {
  decode: function(reader, length){
    this.priority = reader.read(16);
    this.weight   = reader.read(16);
    this.port     = reader.read(16);
    this.target   = Packet.Name.decode(reader);
    return this;
  },
  encode: function(record, writer){
    writer = writer || new Packet.Writer();
    writer.write(record.priority, 16);
    writer.write(record.weight  , 16);
    writer.write(record.port    , 16);
    writer.write(record.target  , 16);
    return writer.toBuffer();
  }
};


Packet.Resource.CAA = {
  encode: function(record, writer){
    writer = writer || new Packet.Writer();
    writer.write(record.flags, 8)
    writer.write((record.tag.length), 8)
    var buffer = new Buffer(record.tag + record.value, 'utf8');
    buffer.forEach(function(c){
      writer.write(c, 8);
    });
    return writer.toBuffer();
  }
};

Packet.Reader = BufferReader;
Packet.Writer = BufferWriter;
module.exports = Packet;