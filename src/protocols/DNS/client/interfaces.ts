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
	opcode: number;

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
