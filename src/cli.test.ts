import test from 'ava';

const prevArgs = process.argv;

test.beforeEach(() => {
  // set args?
});

test.afterEach(() => {
  process.argv = prevArgs;
});

test('cli... runs the app?', async (t) => {
  process.argv = ['', '', '--help'];
  await t.notThrowsAsync(async () => {
    const result = await import('./cli.js');
    t.log(result);
    t.truthy(result);
  });
});
