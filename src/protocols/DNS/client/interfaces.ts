export enum RecordType {
	A     = 1,   //  1 a host address
	NS    = 2,   //  2 an authoritative name server
	MD    = 3,   //  3 a mail destination (Obsolete - use MX)
	MF    = 4,   //  4 a mail forwarder (Obsolete - use MX)
	CNAME = 5,   //  5 the canonical name for an alias
	SOA   = 6,   //  6 marks the start of a zone of authority
	MB    = 7,   //  7 a mailbox domain name (EXPERIMENTAL)
	MG    = 8,   //  8 a mail group member (EXPERIMENTAL)
	MR    = 9,   //  9 a mail rename domain name (EXPERIMENTAL)
	NULL  = 10,  //  10 a null RR (EXPERIMENTAL)
	WKS   = 11,  //  11 a well known service description
	PTR   = 12,  //  12 a domain name pointer
	HINFO = 13,  //  13 host information
	MINFO = 14,  //  14 mailbox or mail list information
	MX    = 15,  //  15 mail exchange
	TXT   = 16,  //  16 text strings
}

enum QuestionExraType {
	AXFR  = 252, // 252 A request for a transfer of an entire zone
	MAILB = 253, // 253 A request for mailbox-related records (MB, MG or MR)
	MAILA = 254, // 254 A request for mail agent RRs (Obsolete - see MX)
	ALL   = 255, // 255 A request for all records
}

export type QuestionType = RecordType | QuestionExraType;

export enum RecordClass {
	IN    = 1,   //  1 the Internet
	CS    = 2,   //  2 the CSNET class (obsolete)
	CH    = 3,   //  3 the CHAOS class
	HS    = 4,   //  4 Hesiod [Dyer 87]
}

enum QuestionExtraClass {
	ALL   = 255, // 255 Any class
}

export type QuestionClass = RecordClass | QuestionExtraClass;

export enum OPCode {
	QUERY = 0, // a standard query
	IQUERY = 1, // an inverse query
	STATUS = 2, //a server status request (STATUS)
	// 3-15	Reserved
}

export enum ResponseCode {
	OK = 0,        // No error condition
	FormatErr = 1, // Format error - bad request
	ServerErr = 2, // Server failure
	NotFound = 3,  // Name error - only from authoritative servers, means the domain was not found
	NotImpl = 4,   // Not Implemented - operation not supported
	Refused = 5,   // Refused - name server refuses to perform operation based on policy.
	// 6,-15 Reserved
}

/** @interface IHeader 72 bits/12 octet */
export interface IHeader {
	/** @var {uint16} id A 16 bit identifier for this request/response */
	id: number;

	/** @var {boolean} queryResponse Flag identifying a query (false) or a response (true) */
	qr: boolean;

	/**
	 * @var {uint4} opcode Identifies the kind of query.
	 *     0		is a standard query (QUERY)
	 *     1		is an inverse query (IQUERY)
	 *     2		is a server status request (STATUS)
	 *     3-15		reserved
	 */
	opcode: OPCode;

	/**
	 * @var {boolean} authoritativeAnswer Flag present in responses, which identifies whether the
	 *     responding name server is an authority for the domain name in question.
	 */
	aa: boolean;

	/** @var {boolean} truncated Flag to identify whether the message was truncated */
	tc: boolean;

	/**
	 * @var {boolean} recursionDesired Flag that directs the name server to pursue the query
	 *     recursively. Support for recursive queries is optional.
	 */
	rd: boolean;

	/**
	 * @var {boolean} recursionAvailable Flag set in a response to indicate whether recursion is
	 *     supported by the name server.
	 */
	ra: boolean;

	/** @var {uint3} z Reserved for future use. Must be zero */
	z: 0;

	/**
	 * @var {uint4} responseCode
	 *     0		No error condition
	 *     1		Format error - bad request
	 *     2		Server failure
	 *     3		Name error - only from authoritative servers, means the domain was not found
	 *     4		Not Implemented - operation not supported
	 *     5		Refused - name server refuses to perform operation based on policy.
	 *     6-15		Reserved
	 */
	rcode: number;

	/** @var {uint16} questionCount */
	qdcount: number;

	/** @var {uint16} answerCount */
	ancount: number;

	/** @var {uint16} nsCount the number of name server records in the authority section */
	nscount: number;

	/** @var {uint16} arCount the number of resource records in the additional records section */
	arcount: number;
};


export interface IQuestion {
	name: string;

	/** @var {int16} aType */
	type: QuestionType;

	/** @var {int16} qClass */
	qClass: QuestionClass;
}

////

export interface IRDataA {
	address: string;
}

export interface IRDataMX {
	/** @var {uint16} priority preference given to this RR, lower values preferred */
	priority: number;

	/** @var {string} exchange A domain name specifying the mail exchange server */
	exchange: string;
}

export interface IRDataAAAA {}

export interface IRDataNS {
	/** @var {string} nsDName a domain name specifying the authoritative name server host */
	nsDName: string;
}

export interface IRDataCNAME {
	/** @var {string} domain  A <domain-name> which specifies the canonical or primary name for the
	 *  owner. The owner name is an alias. */
	domain: string;
}

export interface IRDataTXT {
	/** @var {string} text  One or more <character-string>s */
	text: string;
}

export interface IRDataSOA {
	/** @var {string} mName  The <domain-name> of the name server that was the original or primary
	 * source of data for this zone. */
	mName: string;

	/** @var {string} rName  A <domain-name> which specifies the mailbox of the person responsible
	 * for this zone. */
	rName: string;

	/** @var {uint32} serial  The unsigned 32 bit version number of the original copy of the zone.
	 * Zone transfers preserve this value.  This value wraps and should be compared using sequence
	 * space arithmetic. */
	serial: number;

	/** @var {int32} refresh  A 32 bit time interval before the zone should be refreshed. */
	refresh: number;

	/** @var {int32} retry  A 32 bit time interval that should elapse before a failed refresh
	 * should be retried. */
	retry: number;

	/** @var {int32} expire  A 32 bit time value that specifies the upper limit on the time
	 * interval that can elapse before the zone is no longer authoritative. */
	expire: number;

	/** @var {uint32} minimum  The unsigned 32 bit minimum TTL field that should be exported with
	 * any RR from this zone. */
	minimum: number;
}

export interface IRDataSRV {
	// TODO
	priority: number;
	weight: number;
	port: number;
	target: string;
}

export interface IRDataCAA {
	// TODO
}

type RData = IRDataA | IRDataMX | IRDataAAAA | IRDataNS | IRDataCNAME | IRDataTXT | IRDataSOA | IRDataSRV | IRDataCAA

export interface IResourceRecord {
	name: string;

	type: RecordType;

	class: RecordClass;

	ttl: number;

	rdLength: number;

	rdata: RData;
}

interface DnsQueryOptions {
	recurse?: boolean;
}

export interface IMessage {
	header: IHeader;

	questions: IQuestion[];
	answers: IResourceRecord[];
	authorities: IResourceRecord[];
	additionals: IResourceRecord[];
}
