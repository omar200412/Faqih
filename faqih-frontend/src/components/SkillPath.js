// src/components/SkillPath.js — winding circular lesson path (FiqhQuest-style).
// Pure presentation: state ('done'|'next'|'locked') and unlock rules are
// computed by the caller (HomeScreen), this only draws the path.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radius, shadow, fonts } from '../theme';

const NODE_SIZE = 64;
const ROW_HEIGHT = 96;
const AMPLITUDE = 70; // how far nodes swing left/right of center

function xForRow(i) {
  return Math.sin(i * 1.1) * AMPLITUDE;
}

export function SkillPath({ nodes, onPressNode }) {
  const width = AMPLITUDE * 2 + NODE_SIZE + 40;
  const height = nodes.length * ROW_HEIGHT + NODE_SIZE;
  const centerX = width / 2;

  const points = nodes.map((_, i) => ({
    x: centerX + xForRow(i),
    y: i * ROW_HEIGHT + NODE_SIZE / 2,
  }));

  let d = '';
  points.forEach((p, i) => {
    if (i === 0) { d += `M ${p.x} ${p.y}`; return; }
    const prev = points[i - 1];
    const midY = (prev.y + p.y) / 2;
    d += ` C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
  });

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={d} stroke={colors.neutral} strokeWidth={6} fill="none" strokeLinecap="round" />
      </Svg>
      {nodes.map((node, i) => {
        const p = points[i];
        const isRight = xForRow(i) >= 0;
        return (
          <View key={node.id} style={{ position: 'absolute', left: p.x - NODE_SIZE / 2, top: p.y - NODE_SIZE / 2 }}>
            <TouchableOpacity
              disabled={node.state === 'locked'}
              onPress={() => onPressNode(node.id)}
              activeOpacity={0.85}
              style={[
                styles.node,
                node.state === 'done' && styles.nodeDone,
                node.state === 'next' && styles.nodeNext,
                node.state === 'locked' && styles.nodeLocked,
              ]}
            >
              <Text style={styles.nodeIcon}>
                {node.state === 'done' ? '✓' : node.state === 'locked' ? '🔒' : '💧'}
              </Text>
            </TouchableOpacity>
            <View style={[styles.labelPill, isRight ? styles.labelRight : styles.labelLeft]}>
              <Text style={styles.labelText} numberOfLines={2}>{node.title}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center' },
  node: {
    width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.neutral, ...shadow.sm,
  },
  nodeDone:   { backgroundColor: colors.primaryDark },
  nodeNext:   { backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.primaryPale, ...shadow.md },
  nodeLocked: { backgroundColor: colors.neutral, opacity: 0.7 },
  nodeIcon:   { fontSize: 24, color: colors.white },
  labelPill: {
    position: 'absolute', top: NODE_SIZE / 2 - 12, width: 130,
    backgroundColor: colors.card, borderRadius: radius.full,
    paddingVertical: 6, paddingHorizontal: 12, ...shadow.sm,
  },
  labelLeft:  { left: NODE_SIZE + 8 },
  labelRight: { right: NODE_SIZE + 8 },
  labelText:  { fontSize: 12, fontFamily: fonts.semibold, color: colors.text, textAlign: 'center' },
});
