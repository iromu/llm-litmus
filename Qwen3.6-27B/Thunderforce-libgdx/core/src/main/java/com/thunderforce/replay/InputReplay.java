package com.thunderforce.replay;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.utils.Array;

/**
 * Records and replays frame-level input sequences.
 * Enables deterministic demo runs by recording a "golden run"
 * and replaying it frame-by-frame.
 */
public class InputReplay {

    private final Array<InputFrame> recording;
    private final Array<Byte> packedData; // Compact binary storage
    private int replayIndex;
    private boolean isRecording;
    private boolean isReplaying;
    private final SeededRng rng;

    public InputReplay(long seed) {
        this.recording = new Array<>(true, 60 * 60 * 3); // ~3 min @ 60fps
        this.packedData = new Array<>(true, 60 * 60 * 3);
        this.rng = new SeededRng(seed);
        this.replayIndex = 0;
        this.isRecording = false;
        this.isReplaying = false;
    }

    // === Recording ===

    public void startRecording() {
        recording.clear();
        packedData.clear();
        replayIndex = 0;
        isRecording = true;
        isReplaying = false;
    }

    public void recordFrame(InputFrame frame) {
        if (!isRecording) return;
        recording.add(frame);
        packedData.add(frame.pack());
    }

    public void stopRecording() {
        isRecording = false;
        Gdx.app.log("InputReplay", "Recorded " + recording.size + " frames");
    }

    // === Replay ===

    public void startReplay() {
        replayIndex = 0;
        isReplaying = true;
        isRecording = false;
    }

    public InputFrame getNextFrame() {
        if (!isReplaying || replayIndex >= packedData.size) {
            // End of replay - return neutral input
            return new InputFrame();
        }
        byte data = packedData.get(replayIndex++);
        InputFrame frame = new InputFrame();
        frame.unpack(data);
        return frame;
    }

    public boolean isReplayComplete() {
        return replayIndex >= packedData.size;
    }

    // === Serialization ===

    /**
     * Serialize to compact byte array: [seed:8][count:4][frames:N]
     */
    public byte[] serialize() {
        int totalSize = 8 + 4 + packedData.size;
        byte[] data = new byte[totalSize];
        int offset = 0;

        // Write seed (8 bytes)
        long seed = rng.getSeed();
        for (int i = 7; i >= 0; i--) {
            data[offset++] = (byte) ((seed >> (i * 8)) & 0xFF);
        }

        // Write frame count (4 bytes)
        int count = packedData.size;
        for (int i = 3; i >= 0; i--) {
            data[offset++] = (byte) ((count >> (i * 8)) & 0xFF);
        }

        // Write frames
        for (int i = 0; i < packedData.size; i++) {
            data[offset++] = packedData.get(i);
        }

        return data;
    }

    /**
     * Deserialize from byte array.
     */
    public void deserialize(byte[] data) {
        int offset = 0;

        // Read seed (8 bytes)
        long seed = 0;
        for (int i = 0; i < 8; i++) {
            seed = (seed << 8) | (data[offset++] & 0xFF);
        }

        // Read frame count (4 bytes)
        int count = 0;
        for (int i = 0; i < 4; i++) {
            count = (count << 8) | (data[offset++] & 0xFF);
        }

        // Read frames
        packedData.clear();
        recording.clear();
        for (int i = 0; i < count && offset < data.length; i++) {
            byte frameData = data[offset++];
            packedData.add(frameData);

            InputFrame frame = new InputFrame();
            frame.unpack(frameData);
            recording.add(frame);
        }

        replayIndex = 0;
        Gdx.app.log("InputReplay", "Deserialized " + count + " frames");
    }

    // === State ===

    public boolean isRecording() {
        return isRecording;
    }

    public boolean isReplaying() {
        return isReplaying;
    }

    public int getFrameCount() {
        return recording.size;
    }

    public int getReplayIndex() {
        return replayIndex;
    }

    public SeededRng getRng() {
        return rng;
    }
}
