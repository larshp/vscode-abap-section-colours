import * as assert from 'assert';
import { findAbapSectionHeaderRanges, findAbapSectionLineRanges } from '../../extension';

suite('Web Extension Test Suite', () => {
	test('finds ABAP class definition section ranges', () => {
		const ranges = findAbapSectionLineRanges([
			'CLASS zcl_demo DEFINITION PUBLIC.',
			'  PUBLIC SECTION.',
			'    METHODS run.',
			'  PROTECTED SECTION.',
			'    DATA value TYPE string.',
			'  PRIVATE SECTION.',
			'    METHODS helper.',
			'ENDCLASS.'
		].join('\n'));

		assert.deepStrictEqual(ranges, [
			{ kind: 'public', startLine: 1, endLine: 2 },
			{ kind: 'protected', startLine: 3, endLine: 4 },
			{ kind: 'private', startLine: 5, endLine: 6 }
		]);
	});

	test('matches section headers case-insensitively', () => {
		const ranges = findAbapSectionLineRanges([
			'class zcl_demo definition.',
			'  Public Section.',
			'    methods run.',
			'endclass.'
		].join('\n'));

		assert.deepStrictEqual(ranges, [
			{ kind: 'public', startLine: 1, endLine: 2 }
		]);
	});

	test('finds ABAP section header text ranges', () => {
		const ranges = findAbapSectionHeaderRanges([
			'CLASS zcl_demo DEFINITION PUBLIC.',
			'  PUBLIC SECTION.',
			'  PROTECTED SECTION.  ',
			'  PRIVATE SECTION.',
			'ENDCLASS.'
		].join('\n'));

		assert.deepStrictEqual(ranges, [
			{ kind: 'public', line: 1, startCharacter: 0, endCharacter: 17 },
			{ kind: 'protected', line: 2, startCharacter: 0, endCharacter: 22 },
			{ kind: 'private', line: 3, startCharacter: 0, endCharacter: 18 }
		]);
	});
});
