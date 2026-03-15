/**
 * @jest-environment jsdom
 */

const { playNotificationSound } = require('../../src/utils/sound');

describe('Sound Utilities', () => {
    // Mock AudioContext
    let mockOscillator;
    let mockGainNode;
    let mockAudioContext;

    beforeEach(() => {
        mockOscillator = {
            type: '',
            frequency: {
                setValueAtTime: jest.fn(),
                exponentialRampToValueAtTime: jest.fn()
            },
            connect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn()
        };

        mockGainNode = {
            gain: {
                setValueAtTime: jest.fn(),
                exponentialRampToValueAtTime: jest.fn()
            },
            connect: jest.fn()
        };

        mockAudioContext = {
            currentTime: 0,
            createOscillator: jest.fn().mockReturnValue(mockOscillator),
            createGain: jest.fn().mockReturnValue(mockGainNode),
            destination: {}
        };

        // Set AudioContext and webkitAudioContext on global (jsdom doesn't provide them)
        global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
        global.webkitAudioContext = jest.fn().mockImplementation(() => mockAudioContext);

        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        delete global.AudioContext;
        delete global.webkitAudioContext;
        console.error.mockRestore();
    });

    describe('playNotificationSound', () => {
        test('should create AudioContext', () => {
            global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

            playNotificationSound();

            expect(global.AudioContext).toHaveBeenCalled();
        });

        test('should create oscillator with sine type', () => {
            global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

            playNotificationSound();

            expect(mockAudioContext.createOscillator).toHaveBeenCalled();
            expect(mockOscillator.type).toBe('sine');
        });

        test('should set oscillator frequency', () => {
            global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

            playNotificationSound();

            expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(500, expect.any(Number));
            expect(mockOscillator.frequency.exponentialRampToValueAtTime)
                .toHaveBeenCalledWith(1000, expect.any(Number));
        });

        test('should create gain node', () => {
            global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

            playNotificationSound();

            expect(mockAudioContext.createGain).toHaveBeenCalled();
        });

        test('should set gain values', () => {
            global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

            playNotificationSound();

            expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.1, expect.any(Number));
            expect(mockGainNode.gain.exponentialRampToValueAtTime)
                .toHaveBeenCalledWith(0.001, expect.any(Number));
        });

        test('should connect oscillator to gain node', () => {
            global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

            playNotificationSound();

            expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode);
        });

        test('should connect gain node to destination', () => {
            global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

            playNotificationSound();

            expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
        });

        test('should start and stop oscillator', () => {
            global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

            playNotificationSound();

            expect(mockOscillator.start).toHaveBeenCalled();
            expect(mockOscillator.stop).toHaveBeenCalledWith(expect.any(Number));
        });

        test('should use webkitAudioContext as fallback', () => {
            global.AudioContext = undefined;
            global.webkitAudioContext = jest.fn().mockImplementation(() => mockAudioContext);

            playNotificationSound();

            expect(global.webkitAudioContext).toHaveBeenCalled();
        });

        test('should handle errors gracefully', () => {
            global.AudioContext = jest.fn().mockImplementation(() => {
                throw new Error('AudioContext not supported');
            });

            expect(() => playNotificationSound()).not.toThrow();
            expect(console.error).toHaveBeenCalledWith('Audio play failed', expect.any(Error));
        });

        test('should handle null AudioContext', () => {
            global.AudioContext = null;
            global.webkitAudioContext = null;

            expect(() => playNotificationSound()).not.toThrow();
        });

        test('should handle AudioContext creation failure', () => {
            global.AudioContext = jest.fn().mockImplementation(() => {
                throw new TypeError('Failed to construct AudioContext');
            });

            playNotificationSound();

            expect(console.error).toHaveBeenCalledWith('Audio play failed', expect.any(TypeError));
        });
    });

    describe('sound properties', () => {
        test('should configure sine wave', () => {
            global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

            playNotificationSound();

            expect(mockOscillator.type).toBe('sine');
        });

        test('should start at 500Hz and ramp to 1000Hz', () => {
            global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);

            playNotificationSound();

            const setValueCalls = mockOscillator.frequency.setValueAtTime.mock.calls;
            const rampCalls = mockOscillator.frequency.exponentialRampToValueAtTime.mock.calls;

            expect(setValueCalls[0][0]).toBe(500);
            expect(rampCalls[0][0]).toBe(1000);
        });

        test('should play for 0.5 seconds', () => {
            global.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
            mockAudioContext.currentTime = 100;

            playNotificationSound();

            expect(mockOscillator.stop).toHaveBeenCalledWith(100.5);
        });
    });
});
