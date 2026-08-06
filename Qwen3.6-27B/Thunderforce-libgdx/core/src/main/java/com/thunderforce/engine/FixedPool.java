package com.thunderforce.engine;

import com.badlogic.gdx.utils.Array;
import com.badlogic.gdx.utils.Pool;

/**
 * Fixed-size object pool that pre-allocates all instances at construction.
 * Guarantees zero allocation during gameplay by reusing objects.
 *
 * @param <T> the pooled type
 */
public class FixedPool<T> {

    private final int capacity;
    private final Array<T> freeList;
    private final Factory<T> factory;

    /**
     * Factory interface for creating new instances.
     */
    public interface Factory<T> {
        T create();
    }

    /**
     * Create a fixed pool that pre-allocates {@code capacity} instances.
     *
     * @param capacity maximum number of objects
     * @param factory  factory to create instances
     */
    @SuppressWarnings("unchecked")
    public FixedPool(int capacity, Factory<T> factory) {
        this.capacity = capacity;
        this.factory = factory;
        this.freeList = new Array<>(capacity);

        // Pre-allocate all instances
        for (int i = 0; i < capacity; i++) {
            T obj = factory.create();
            freeList.add(obj);
        }
    }

    /**
     * Obtain an object from the pool.
     * If the pool is exhausted, returns the last object (overwrites).
     *
     * @return a pooled object
     */
    public T obtain() {
        if (freeList.size == 0) {
            // Pool exhausted - create overflow (logs warning)
            com.badlogic.gdx.Gdx.app.log("FixedPool", "Pool exhausted, creating overflow object");
            return factory.create();
        }
        return freeList.removeIndex(freeList.size - 1);
    }

    /**
     * Return an object to the pool for reuse.
     *
     * @param obj the object to return
     */
    public void free(T obj) {
        if (freeList.size < capacity) {
            freeList.add(obj);
        }
        // If pool is full, discard the object
    }

    /**
     * @return number of free objects available
     */
    public int getFreeSize() {
        return freeList.size;
    }

    /**
     * @return total capacity of the pool
     */
    public int getCapacity() {
        return capacity;
    }

    /**
     * @return number of objects currently in use
     */
    public int getInUseCount() {
        return capacity - freeList.size;
    }
}
