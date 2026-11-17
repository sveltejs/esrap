// Exposed in through TypeScript expressions.
for ((key in object as boolean);;);
for (let value = (key in object as boolean);;);
for ((key in object satisfies boolean);;);
for (let value = (key in object satisfies boolean);;);
for ((key in object as boolean === true);;);
for (let value = (key in object as boolean === true);;);

// Protected in through TypeScript expressions.
for (((enabled && key in object) as boolean);;);
for (let value = ((enabled && key in object) as boolean);;);
for (((enabled && key in object) satisfies boolean);;);
for (let value = ((enabled && key in object) satisfies boolean);;);
for (((key in object as number) | mask);;);
for (let value = ((key in object as number) | mask);;);
for (((key in object)!);;);
for (let value = ((key in object)!);;);
for ((<boolean>(key in object));;);
for (let value = (<boolean>(key in object));;);
