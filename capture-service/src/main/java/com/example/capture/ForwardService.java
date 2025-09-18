package com.example.capture;

import org.pcap4j.core.*;
import org.pcap4j.packet.Packet;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.io.FileInputStream;

@Service
public class ForwardService {

    private final RestTemplate rest = new RestTemplate();
    private final String parserUrl = "http://parser-service:8080/api/parse"; // when in docker compose
    private final String parserUrlLocal = "http://localhost:8082/api/parse"; // for local dev

    public void forwardRawPacket(byte[] raw) {
        try {
            // send to parser as JSON (base64)
            PacketPayload payload = new PacketPayload(raw);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<PacketPayload> req = new HttpEntity<>(payload, headers);
            try {
                rest.postForObject(parserUrl, req, String.class);
            } catch (Exception e) {
                // fallback to local
                try { rest.postForObject(parserUrlLocal, req, String.class); } catch (Exception ex) { /* ignore */ }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void forwardPcapFile(String path) {
        try {
            PcapHandle handle = Pcaps.openOffline(path);
            Packet pkt;
            while ((pkt = handle.getNextPacket()) != null) {
                forwardRawPacket(pkt.getRawData());
            }
            handle.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    static class PacketPayload {
        public String raw_base64;
        public PacketPayload(byte[] raw) {
            this.raw_base64 = java.util.Base64.getEncoder().encodeToString(raw);
        }
    }
}
