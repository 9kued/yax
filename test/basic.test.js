import expect from 'expect';
import yax from '../src/index';
import { count, delay } from './count';

describe('basic', () => {
  it('basic without modules', (done) => {
    const store = yax({
      state: {
        foo: 0,
        bar: 0
      },
      reducers: {
        addFooDone (state, payload) {
          const foo = state.foo + payload;
          return { ...state, foo };
        },
        addBarDone (state, payload) {
          const bar = state.bar + payload;
          return { ...state, bar };
        }
      },
      actions: {
        async addFoo ({ commit }) {
          await delay(1);
          commit('addFooDone', 1);
        },
        async addBar ({ commit }) {
          await delay(1);
          commit('addBarDone', 1);
        },
        async addAll ({ dispatch }) {
          await dispatch('addFoo');
          await dispatch('addBar');
        }
      }
    });

    store.dispatch({ type: 'addAll' });

    setTimeout(() => {
      expect(store.getState().foo).toEqual(1);
      expect(store.getState().bar).toEqual(1);
      done();
    }, 100);
  });

  it('basic module', (done) => {
    const store = yax({
      modules: { count }
    });

    store.dispatch({
      type: 'count/add',
      payload: 2
    });
    store.dispatch({
      type: 'count/minus',
      payload: 1
    });

    setTimeout(() => {
      expect(store.getState().count).toEqual(1);
      done();
    }, 100);
  });

  it('basic module with root dispatch', (done) => {
    const store = yax({
      modules: {
        foo: {
          state: 0,
          reducers: {
            addDone (state, payload) {
              return state + payload;
            }
          },
          actions: {
            async add ({ dispatch, commit }) {
              await dispatch('bar/add', 2, true);
              await dispatch({
                type: 'bar/add',
                payload: 2
              }, true);
              commit('addDone', 1);
            }
          }
        },
        bar: {
          state: 0,
          reducers: {
            addDone (state, payload) {
              return state + payload;
            }
          },
          actions: {
            async add ({ dispatch, commit }, payload) {
              await delay(1);
              commit('addDone', payload);
            }
          }
        }
      }
    });

    store.dispatch({
      type: 'foo/add'
    });

    setTimeout(() => {
      expect(store.getState().foo).toEqual(1);
      expect(store.getState().bar).toEqual(4);
      done();
    }, 100);
  });

  it('basic module registration', () => {
    const store = yax({
      modules: {
        foo: {
          state: { bar: 1 },
          reducers: {
            inc: state => {
              state.bar++;
              return state;
            }
          },
          actions: {
            incFoo: ({ commit }) => commit('inc')
          }
        }
      }
    });
    store.registerModule('hi', {
      state: { a: 1 },
      reducers: {
        inc: state => {
          state.a++;
          return state;
        }
      },
      actions: {
        incFoo: ({ commit }) => commit('inc')
      }
    });

    expect(store.getState().hi.a).toEqual(1);
    expect(store.getState().foo.bar).toEqual(1);

    // test dispatching actions defined in dynamic module
    store.dispatch({ type: 'foo/inc' });
    store.dispatch({ type: 'hi/inc' });
    expect(store.getState().hi.a).toEqual(2);
    expect(store.getState().foo.bar).toEqual(2);

    // unregister
    store.unregisterModule('hi');
    expect(store.getState().hi).toEqual(undefined);

    // assert initial modules still work as expected after unregister
    store.dispatch({ type: 'foo/incFoo' });
    expect(store.getState().foo.bar).toEqual(3);

    expect(() => store.registerModule({})).toThrow(/module path must be a string or an Array/);
    expect(() => store.unregisterModule({})).toThrow(/module path must be a string or an Array/);
  });

  it('basic select', () => {
    const store = yax({
      state: {
        foo: 1
      },
      modules: {
        count: {
          state: { a: 1 },
          reducers: {
            addDone (state, payload) {
              state.a += payload;
              return state;
            },
            minusDone (state, payload) {
              state.a -= payload;
              return state;
            }
          },
          actions: {
            add ({ commit, select }) {
              const { a } = select();
              commit('addDone', a);
            },
            minus ({ commit, select }) {
              const v = select((state, rootState) => rootState.foo);
              commit('minusDone', v);
            }
          }
        }
      }
    });

    store.dispatch({
      type: 'count/add'
    });
    store.dispatch({
      type: 'count/add'
    });
    store.dispatch({
      type: 'count/minus'
    });

    expect(store.getState().foo).toEqual(1);
    expect(store.getState().count.a).toEqual(3);
  });

  it('basic module register', (done) => {
    const store = yax({
      modules: {
        foo: {}
      }
    });
    // register twice
    store.registerModule('count', count);
    store.registerModule('count', count);
    // register nested
    store.registerModule(['foo', 'count'], count);

    store.dispatch({
      type: 'count/add',
      payload: 2
    });
    store.dispatch({
      type: 'count/minus',
      payload: 1
    });
    store.dispatch({
      type: 'foo/count/add',
      payload: 2
    });
    store.dispatch({
      type: 'foo/count/minus',
      payload: 1
    });

    setTimeout(() => {
      expect(store.getState().count).toEqual(2);
      expect(store.getState().foo.count).toEqual(1);
      done();
    }, 100);
  });

  it('basic nested modules', () => {
    const reducers = {
      add ({ a }, n) {
        return { a: a + n };
      }
    };
    const store = yax({
      state: { a: 1 },
      reducers,
      modules: {
        nested: {
          state: { a: 2 },
          reducers,
          modules: {
            one: {
              state: { a: 3 },
              reducers
            },
            nested: {
              modules: {
                two: {
                  state: { a: 4 },
                  reducers
                },
                three: {
                  state: { a: 5 },
                  reducers
                }
              }
            }
          }
        },
        four: {
          state: { a: 6 },
          reducers
        }
      }
    });

    store.dispatch({ type: 'add', payload: 1 });
    store.dispatch({ type: 'nested/add', payload: 1 });
    store.dispatch({ type: 'nested/one/add', payload: 1 });
    store.dispatch({ type: 'nested/nested/two/add', payload: 1 });
    store.dispatch({ type: 'nested/nested/three/add', payload: 1 });
    store.dispatch({ type: 'four/add', payload: 1 });

    expect(store.getState().a).toEqual(2);
    expect(store.getState().nested.a).toEqual(3);
    expect(store.getState().nested.one.a).toEqual(4);
    expect(store.getState().nested.nested.two.a).toEqual(5);
    expect(store.getState().nested.nested.three.a).toEqual(6);
    expect(store.getState().four.a).toEqual(7);
  });
});
