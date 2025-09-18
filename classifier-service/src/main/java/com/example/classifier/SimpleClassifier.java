package com.example.classifier;

import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class SimpleClassifier {

    public String classify(Map<String, Object> pkt) {
        Integer dstPort = null;
        try {
            Object dp = pkt.get("dst_port");
            if (dp instanceof Integer) dstPort = (Integer) dp;
            else if (dp instanceof Number) dstPort = ((Number) dp).intValue();
            else if (dp != null) dstPort = Integer.parseInt(dp.toString());
        } catch (Exception e) { /* ignore */ }

        String protocol = pkt.getOrDefault("protocol", "").toString();

        if (dstPort != null && (dstPort == 53 || dstPort == 5353)) return "DNS";
        if (dstPort != null && (dstPort == 80 || dstPort == 8080 || dstPort == 443)) return "HTTP/HTTPS";
        if ("TCP".equalsIgnoreCase(protocol) && dstPort != null && dstPort > 0 && dstPort < 1024) return "TCP-wellknown";

        Integer len = 0;
        try {
            Object l = pkt.get("length");
            if (l instanceof Integer) len = (Integer) l;
            else if (l instanceof Number) len = ((Number) l).intValue();
            else if (l != null) len = Integer.parseInt(l.toString());
        } catch (Exception e) { /* ignore */ }

        if (len != null && len > 1500) return "ANOMALY-large-packet";

        return "UNKNOWN";
    }
}
