type Amount = number;

const count = 2;
const limit = 3;

function identity<T>(value: T) {
	return value;
}

const cast_less = (count as Amount) < limit;
const satisfies_less = (count satisfies Amount) < limit;
const cast_shift = (count as Amount) << limit;
const satisfies_shift = (count satisfies Amount) << limit;
const generic_less = (identity<number>) < limit;
const generic_greater = (identity<number>) > limit;
const generic_greater_equal = (identity<number>) >= limit;
const generic_shift = (identity<number>) >> limit;
const generic_unsigned_shift = (identity<number>) >>> limit;
const cast_less_equal = (count as Amount) <= limit;
const cast_add = count as Amount + limit;
const cast_right = count < (limit as Amount);
const generic_right = count >> identity<number>;
const generic_equal = identity<number> === identity;

const results = [
	cast_less,
	satisfies_less,
	cast_shift,
	satisfies_shift,
	generic_less,
	generic_greater,
	generic_greater_equal,
	generic_shift,
	generic_unsigned_shift,
	cast_less_equal,
	cast_add,
	cast_right,
	generic_right,
	generic_equal
];