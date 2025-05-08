import { foo } from 'x' with { type: 'json' };
import { bar } from 'y' with { "blah": "true", baz: "false" };

import('baz', { with: { stuff: true } }).then(blah);