const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const getBalance = require('@aragon/test-helpers/balance')(web3)

const Checkpointing = artifacts.require('CheckpointingMock')

const getContract = name => artifacts.require(name)


contract('Checkpointing', (accounts) => {
  let checkpointing

  const generateRandomTest = size => {
    const rand = () => parseInt(10000 * Math.random())

    let values = []
    let expects = []

    for (let i = 0; i < size; i++) {
      const prev = values[i - 1] || { t: 0, v: 0 }
      const t = 1 + prev.t + rand()
      const v = rand()
      values.push({ t, v })

      expects.push({ t: t - 1, v: prev.v })
      expects.push({ t, v })
    }

    return {
      values,
      expects,
      size,
    }
  }

  const tests = [
    { 
      description: 'odd number of checkpoints',
      values: [{ t: 1, v: 2 }, { t: 3, v: 5 }, { t: 5, v: 3 }],
      expects: [{ t: 0, v: 0 }, { t: 1, v: 2 }, { t: 2, v: 2 }, { t: 3, v: 5 }, { t: 4, v: 5 }, { t: 5, v: 3 }, { t: 1000, v: 3 }], 
      size: 3
    },
    {
      description: 'even number of checkpoints',
      values: [{ t: 1, v: 2 }, { t: 3, v: 5 }, { t: 5, v: 3 }, { t: 1000, v: 4 }],
      expects: [{ t: 0, v: 0 }, { t: 1, v: 2 }, { t: 2, v: 2 }, { t: 3, v: 5 }, { t: 4, v: 5 }, { t: 5, v: 3 }, { t: 999, v: 3 }, { t: 1000, v: 4 }],
      size: 4
    },
    {
      description: 'change existing checkpoint',
      values: [{ t: 1, v: 2 }, { t: 3, v: 5 }, { t: 3, v: 6}, { t: 5, v: 3 }],
      expects: [{ t: 0, v: 0 }, { t: 1, v: 2 }, { t: 2, v: 2 }, { t: 3, v: 6 }, { t: 4, v: 6 }, { t: 5, v: 3 }, { t: 1000, v: 3 }],
      size: 3
    },
    {
      description: 'random test small',
      ...generateRandomTest(10),
    },
    {
      description: 'random test big',
      ...generateRandomTest(50),
    },
  ]

  beforeEach(async () => {
    checkpointing = await Checkpointing.new()
  })

  context('checkpointing supports:', () => {
    tests.forEach(({ description, values, expects, size }) => {
      it(description, async () => {

        assert.equal(await checkpointing.lastUpdated(), 0, 'last updated should be 0')

        // add values sequentially
        await values.reduce((prev, { v, t }) => 
          prev.then(() => checkpointing.add(v, t))
        , Promise.resolve())

        await expects.reduce(async (prev, { t, v }) =>
          prev.then(async () =>
            new Promise(async (resolve, reject) => {
              assert.equal(await checkpointing.get(t), v, 'expected value should match checkpoint')
              resolve()
            })          
          )
        , Promise.resolve())

        assert.equal(await checkpointing.getHistorySize(), size, 'size should match')
        assert.equal(await checkpointing.lastUpdated(), values.slice(-1)[0].t, 'last updated should be correct')
      })
    })
  })

  it('fails if inserting past value', async () => {
    const time = 5
    const value = 2

    await checkpointing.add(value, time)

    return assertRevert(async () => {
      await checkpointing.add(value, time - 1)
    })
  })
  
  const UINT64_OVERFLOW = new web3.BigNumber(2).pow(64)
  const UINT192_OVERFLOW = new web3.BigNumber(2).pow(192)

  it('fails if set value is too high', async () => {
    await checkpointing.add(UINT192_OVERFLOW.minus(1), 1) // can set just below limit

    return assertRevert(async () => {
      await checkpointing.add(UINT192_OVERFLOW, 2)
    })
  })

  it('fails if set time is too high', async () => {
    await checkpointing.add(1, UINT64_OVERFLOW.minus(1)) // can set just below limit

    return assertRevert(async () => {
      await checkpointing.add(1, UINT64_OVERFLOW)
    })
  })

  it('fails if requested time is too high', async () => {
    await checkpointing.add(1, 1)

    assert.equal(await checkpointing.get(UINT64_OVERFLOW.minus(1)), 1) // can set just below limit

    return assertRevert(async () => {
      await checkpointing.get(UINT64_OVERFLOW)
    })
  })
})