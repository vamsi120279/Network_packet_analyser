package com.example.capture;

import org.pcap4j.core.*;
import org.pcap4j.packet.Packet;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class PacketSniffer {
    private ExecutorService pool = Executors.newSingleThreadExecutor();
    private PcapHandle handle;

    public interface PacketHandler {
        void handle(byte[] raw);
    }

    public void startLiveCapture(String nif, PacketHandler handler) throws PcapNativeException {
        if (handle != null && handle.isOpen()) {
            // already running
            return;
        }

        PcapNetworkInterface device = Pcaps.getDevByName(nif);
        if (device == null) {
            throw new PcapNativeException("Interface not found: " + nif);
        }

        int snapLen = 65536;
        PromiscuousMode mode = PromiscuousMode.PROMISCUOUS;
        int timeout = 10;
        handle = device.openLive(snapLen, mode, timeout);

        pool.submit(() -> {
            try {
                while (!Thread.currentThread().isInterrupted()) {
                    try {
                        Packet packet = handle.getNextPacketEx();
                        if (packet != null) {
                            handler.handle(packet.getRawData());
                        }
                    } catch (TimeoutException e) {
                        // ignore
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } catch (NotOpenException | PcapNativeException e) {
                e.printStackTrace();
            } finally {
                if (handle != null && handle.isOpen()) {
                    handle.close();
                }
            }
        });
    }

    public void stop() {
        if (handle != null && handle.isOpen()) {
            try {
                handle.breakLoop();
            } catch (NotOpenException e) {
                // ignore
            }
            handle.close();
            handle = null;
        }
        pool.shutdownNow();
    }
}
