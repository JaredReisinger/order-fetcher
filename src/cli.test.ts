import test from 'ava';

// const cfg = {
//   hosts: {
//     foo: {
//       url: 'FOO.URL',
//       key: 'FOO.KEY',
//       secret: 'FOO.SECRET',
//     },
//   },
// };

// const handleGlobalOpts = () => {};
const prevArgs = process.argv;

test.beforeEach(() => {
  // set args?
});

test.afterEach(() => {
  process.argv = prevArgs;
});

test('cli... runs the app?', async (t) => {
  // const result = index.createCommands(cfg, handleGlobalOpts);
  // t.true(result instanceof Promise);
  // await result;
  process.argv = ['', '', '--help'];
  await t.notThrowsAsync(async () => {
    const result = await import('./stub.js');
    // t.log(result);
    t.truthy(result);
  });
});
