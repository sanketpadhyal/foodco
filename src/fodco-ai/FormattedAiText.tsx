import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MarkdownProps {
  content: string;
}

export function FormattedAiText({ content }: MarkdownProps) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <View style={styles.container}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <View key={lineIdx} style={styles.paragraphSpacer} />;
        }

        const isHeading =
          (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length < 50 && !trimmed.slice(2, -2).includes('**')) ||
          trimmed.startsWith('### ') ||
          trimmed.startsWith('## ');

        if (isHeading) {
          const cleanHeading = trimmed.replace(/^#{2,3}\s*/, '').replace(/^\*\*|\*\*$/g, '');
          return (
            <View key={lineIdx} style={styles.headingWrap}>
              <Text style={styles.headingText}>{cleanHeading}</Text>
            </View>
          );
        }

        const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ');
        const bulletText = isBullet ? trimmed.replace(/^[\*\-•]\s*/, '') : trimmed;

        const renderedSegments = parseInlineFormatting(bulletText);

        if (isBullet) {
          return (
            <View key={lineIdx} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletBodyText}>{renderedSegments}</Text>
            </View>
          );
        }

        return (
          <Text key={lineIdx} style={styles.bodyText}>
            {renderedSegments}
          </Text>
        );
      })}
    </View>
  );
}

function parseInlineFormatting(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      const boldContent = part.slice(2, -2);
      return (
        <Text key={idx} style={styles.boldText}>
          {boldContent}
        </Text>
      );
    }
    return <Text key={idx}>{part}</Text>;
  });
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  paragraphSpacer: {
    height: 8,
  },
  headingWrap: {
    marginTop: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 4,
  },
  headingText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 3,
    paddingLeft: 2,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginTop: 8,
    marginRight: 8,
  },
  bulletBodyText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
    marginVertical: 2,
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
});
