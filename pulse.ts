/**
 * This code is created for the Pulse Sensor Amped open platform and based on the code they kindly made available
 */

/**
 * Custom blocks
 */
//% weight=60 color=#444A84 icon="\uf051" block="DOT Pulse"
namespace amped {

    let sampleIntervalMS = 10

    let rate: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

    let inputPin: AnalogPin = AnalogPin.P0
    let QS: boolean = false                             // QS => 'Quantified Self'.  It means we saw a beat.
    let BPM = 5                                         // Beats Per Minute
    let IBI = 600                                       // InterBeat Interval, ms
    let pulse = false
    let sampleCounter: number = 0
    let lastBeatTime: number = 0
    let Peak: number = 512
    let Trough: number = 512
    let threshSetting: number = 550                     // This is a fallback number that we never change
    let thresh: number = threshSetting                  // This number, we do change, but it starts at the fallback position
    let amp:number = 100                                // amplitude is 1/10 of input range.  This might not be right, but that's fine
    let firstBeat: boolean = true                       // Are we currently looking for the first beat?
    let secondBeat: boolean = false                     // We're not yet looking for the second beat in a row, but we will be.
    let signal: number = 0                              // This is what we use to store what we have just measured

    //% block
    export function getSampleInterval() {               // We don't really need to show this to anyone, but it can be useful.
        return sampleIntervalMS
    }

    function mapPinToSample(value: number) {
        return pins.map(value, 500, 1023, 0, 1023)
    }

    //% block="live sample"
    export function getLatestSample() {
        return signal
    }

    //% block
    export function getBPM() {                          // This is one we *do* need to show to anyone who asks.
        return BPM
    }

    function getIBI() {
        return IBI
    }

    function getPulseAmplitude() {
        return amp
    }

    function getLastBeatTime() {                        // We're not interested in the literal time, just how long it has been.
        return lastBeatTime
    }

    function sawStart() {
        let started: boolean = QS
        QS = false
        return started
    }

    function isInsideBeat() {
        return pulse
    }

    //% block
    export function readNextSample() {                  // The signal should start at about 500, but /might/ not.  The commented line is the other option
        //signal = mapPinToSample(pins.analogReadPin(inputPin))
        signal = pins.analogReadPin(inputPin)
    }

    //% block
    export function getSampleCounter() {
        return sampleCounter
    }

    //% block
    export function processLatestSample() {
        sampleCounter += sampleIntervalMS
        let N = sampleCounter - lastBeatTime            // N is a time interval

        // here we can fade the graph in/out if we want.

        // find the peak/trough of the pulse wave.
        if (signal < thresh && N > (IBI / 5) * 3) {     // avoid double beats by waiting 3/5 of time since last
            if (signal < Trough) {
                Trough = signal                         // finding the bottom of the trough
            }
        }
        if (signal > thresh && signal > Peak) {
            Peak = signal                               // keep track of the highest point in the wave
        }

        if (N > 250) {
            if ((signal > thresh) && (pulse == false) && (N > (IBI / 5) * 3)) {
                pulse = true
                IBI = sampleCounter - lastBeatTime
                lastBeatTime = sampleCounter

                if (secondBeat) {
                    secondBeat = false                  // We are no longer looking for the second beat
                    for (let i = 0; i < 10; i++) {
                        rate[i] = IBI                   // Seed the running total to take a quick stab at the BPM
                    }
                }

                if (firstBeat) {
                    firstBeat = false
                    secondBeat = true
                    // We can't yet use IBI to seed the running total, but we can check again for the second beat
                    return   // bug out for the moment, so we don't accidentally continue downwards
                }

                let runningTotal: number = 0
                for (let i = 0; i < 9; i++) {
                    rate[i] = rate[i + 1]               // we could do this with shift, but we'd still have to do the next line...
                    runningTotal += rate[i]
                }

                rate[9] = IBI
                runningTotal += rate[9]
                runningTotal /= 10                      // this gives us an average, so we avoid spikes
                BPM = Math.round(60000 / runningTotal)             // 60,000ms = 60secs
                QS = true                               // Quantified Self (detected a beat!)

            }
        }

        if (signal < thresh && pulse == true) {         // values are going down, so the beat is over
            pulse = false
            amp = Peak - Trough
            thresh = (amp / 2) + Trough                 // this gives us a better idea of amplitude - how big the pulsebeat is
            Peak = thresh
            Trough = thresh
        }
        if (N > 2500) {                                 // 2.5 seconds without a beat means we need to reset
            thresh = threshSetting
            Peak = 512
            Trough = 512
            lastBeatTime = sampleCounter
            firstBeat = true                            // look once more for the first beat
            secondBeat = false
            QS = false
            BPM = 0
            IBI = 600
            pulse = false
            amp = 100
        }
    }
}
