package com.example.parser;

import org.pcap4j.packet.*;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class PacketParser {

    public Map<String, Object> parseFromRawBase64(String base64) {
        try {
            byte[] raw = java.util.Base64.getDecoder().decode(base64);
            return parse(raw);
        } catch (Exception e) {
            Map<String,Object> err = new HashMap<>();
            err.put("error", e.getMessage());
            return err;
        }
    }

    public Map<String, Object> parse(byte[] raw) {
        Map<String, Object> out = new HashMap<>();
        try {
            Packet pkt = EthernetPacket.newPacket(raw, 0, raw.length);
            if (pkt.contains(EthernetPacket.class)) {
                EthernetPacket eth = pkt.get(EthernetPacket.class);
                out.put("src_mac", eth.getHeader().getSrcAddr().toString());
                out.put("dst_mac", eth.getHeader().getDstAddr().toString());
            }
            if (pkt.contains(IpV4Packet.class)) {
                IpV4Packet ip = pkt.get(IpV4Packet.class);
                out.put("src_ip", ip.getHeader().getSrcAddr().getHostAddress());
                out.put("dst_ip", ip.getHeader().getDstAddr().getHostAddress());
                out.put("protocol", ip.getHeader().getProtocol().name());
            }
            if (pkt.contains(TcpPacket.class)) {
                TcpPacket tcp = pkt.get(TcpPacket.class);
                out.put("src_port", tcp.getHeader().getSrcPort().valueAsInt());
                out.put("dst_port", tcp.getHeader().getDstPort().valueAsInt());
                out.put("flags", tcp.getHeader().getFlags().toString());
            } else if (pkt.contains(UdpPacket.class)) {
                UdpPacket udp = pkt.get(UdpPacket.class);
                out.put("src_port", udp.getHeader().getSrcPort().valueAsInt());
                out.put("dst_port", udp.getHeader().getDstPort().valueAsInt());
            }
            out.put("length", raw.length);
            return out;
        } catch (Exception e) {
            e.printStackTrace();
            out.put("error", e.getMessage());
            return out;
        }
    }
}
