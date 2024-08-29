const hello = [
  { name: "hello world", age: 16 },
  { name: "hello world", age: 16 },
];
console.table(hello);

console.time("Timer");
console.groupCollapsed("User Details");
console.log("Name: Alice");
console.log("Age: 25");
console.groupEnd();
console.timeEnd("Timer");
const isTrue = false;
console.assert(isTrue, "Assertion failed: isTrue is false");
console.count("myLabel");
console.count("myLabel");
console.countReset("myLabel");
console.count("myLabel");
const obj = { name: "Alice", age: 25 };
console.dir(obj);
