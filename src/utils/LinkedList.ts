'use strict';

export class LLNode<T> {
	public prev?: LLNode<T>;
	public next?: LLNode<T>;
	public value: T;

	constructor(v: T) {
		this.value = v;
	}
}

interface Iterable<T> {
	[Symbol.iterator](): Iterator<T>;
}

export class LinkedList<T> {
	private first?: LLNode<T>;
	private last?: LLNode<T>;

	private count: number;

	constructor() {
		this.count = 0;
	}

	static fromCollection<T>(e: Iterable<T>): LinkedList<T> {
		let ll = new LinkedList<T>();

		for (let t of e)
			ll.append(t);

		return ll;
	}

	append(value: T): void {
		let nodeNew = new LLNode<T>(value);
		this.appendN(nodeNew);
	}

	appendN(nodeNew: LLNode<T>): void {
		if (this.last === undefined) {
			nodeNew.next = undefined;
			this.first = nodeNew;
			this.last = this.first;
		} else {
			this.insertNAfter(this.last, nodeNew);
		}

		this.count++;
	}

	prepend(value: T): void {
		let nodeNew = new LLNode<T>(value);
		this.prependN(nodeNew);
	}

	prependN(nodeNew: LLNode<T>): void {
		if (this.first === undefined) {
			nodeNew.prev = undefined;
			this.first = nodeNew;
			this.last = this.first;
		} else {
			this.insertNBefore(this.first!, nodeNew);
		}

		this.count++;
	}

	insertAfter(node: LLNode<T>, value: T): void {
		let nodeNew = new LLNode<T>(value);
		this.insertNAfter(node, nodeNew);
	}

	insertNAfter(nodeAnchor: LLNode<T>, nodeNew: LLNode<T>): void {
		nodeNew.prev = nodeAnchor;
		nodeNew.next = nodeAnchor.next;
		nodeAnchor.next = nodeNew;

		if (nodeNew.next !== undefined) {
			nodeNew.next.prev = nodeNew;
		}

		if (this.last === nodeAnchor) {
			nodeNew.next = undefined;
			this.last = nodeNew;
		}
	}

	insertBefore(node: LLNode<T>, value: T): void {
		let nodeNew = new LLNode<T>(value);
		this.insertNBefore(node, nodeNew);
	}

	insertNBefore(nodeAnchor: LLNode<T>, nodeNew: LLNode<T>): void {
		nodeNew.prev = nodeAnchor.prev;
		nodeNew.next = nodeAnchor;
		nodeAnchor.prev = nodeNew;

		if (nodeNew.prev !== undefined) {
			nodeNew.prev.next = nodeNew;
		}

		if (this.first === nodeAnchor) {
			nodeNew.prev = undefined;
			this.first = nodeNew;
		}
	}

	popFirst(): T | undefined {
		if (this.first === undefined)
			return;

		let firstVal = this.first.value;
		this.remove(this.first);
		return firstVal;
	}

	popLast(): T | undefined {
		if (this.last === undefined)
			return;

		let lastVal = this.last.value;
		this.remove(this.last);
		return lastVal;
	}

	remove(node: LLNode<T>): void {
		if (node.prev !== undefined) {
			node.prev.next = node.next;
		}

		if (node.next !== undefined) {
			node.next.prev = node.prev;
		}

		if (node === this.first) {
			this.first = node.next;
		}

		if (node === this.last) {
			this.last = node.prev;
		}

		this.count--;

		// Sanity
		node.prev = undefined;
		node.next = undefined;
	}

	clear(): void {
		this.count = 0;
		this.first = undefined;
		this.last = undefined;
	}

	getFirst(): T | undefined {
		return (this.first === undefined)? undefined : this.first!.value;
	}

	getFirstN(): LLNode<T> | undefined {
		return this.first;
	}

	getLast(): T | undefined {
		return (this.last === undefined)? undefined : this.last!.value;
	}

	getLastN(): LLNode<T> | undefined {
		return this.last;
	}

	size(): number {
		return this.count;
	}

	isEmpty(): boolean {
		return this.count == 0;
	}

	toArray(): T[] {
		return new Array(...this);
	}

	valuesReversed(): Iterable<T> {
		let nodeCur = this.last;
		return {
			*[Symbol.iterator](): IterableIterator<T> {
				while (nodeCur !== undefined) {
					yield nodeCur.value;
					nodeCur = nodeCur.prev;
				}
			}
		}
	}

	nodes(): Iterable<LLNode<T>> {
		let nodeCur = this.first;
		return {
			*[Symbol.iterator](): IterableIterator<LLNode<T>> {
				while (nodeCur !== undefined) {
					let nodeNext = nodeCur.next;
					yield nodeCur;
					nodeCur = nodeNext;
				}
			}
		}
	}

	nodesReversed(): Iterable<LLNode<T>> {
		let nodeCur = this.last;
		return {
			*[Symbol.iterator](): IterableIterator<LLNode<T>> {
				while (nodeCur !== undefined) {
					let nodeNext = nodeCur.prev;
					yield nodeCur;
					nodeCur = nodeNext;
				}
			}
		}
	}

	*[Symbol.iterator](): IterableIterator<T> {
		let nodeCur = this.first;

		while (nodeCur !== undefined) {
			yield nodeCur.value;
			nodeCur = nodeCur.next;
		}
	}
}