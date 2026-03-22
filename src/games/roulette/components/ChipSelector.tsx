import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { rouletteTheme } from "../assets/theme";

type ChipSelectorProps = {
  selectedChip: number;
  chips: readonly number[];
  onSelect: (chipValue: number) => void;
};

export function ChipSelector({ selectedChip, chips, onSelect }: ChipSelectorProps) {
  const { width } = useWindowDimensions();
  const isPhone = width < 430;

  return (
    <View style={[styles.container, isPhone && styles.containerPhone]}>
      {chips.map((chipValue) => {
        const selected = chipValue === selectedChip;
        return (
          <Pressable
            key={chipValue}
            style={({ hovered, pressed }: any) => [
              styles.chip,
              isPhone && styles.chipPhone,
              selected ? styles.chipSelected : null,
              hovered ? styles.chipHover : null,
              pressed ? styles.chipPressed : null,
            ]}
            onPress={() => onSelect(chipValue)}
          >
            <View style={styles.chipGloss} />
            <Text style={[styles.chipText, isPhone && styles.chipTextPhone, selected && styles.chipTextSelected]}>{chipValue}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  containerPhone: {
    gap: 8,
  },
  chip: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: rouletteTheme.colors.violet,
    backgroundColor: "rgba(19, 24, 46, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  chipPhone: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  chipGloss: {
    position: "absolute",
    top: 4,
    left: 10,
    right: 10,
    height: 13,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.26)",
  },
  chipSelected: {
    borderColor: rouletteTheme.colors.warmGold,
    backgroundColor: "rgba(52, 34, 8, 0.95)",
    ...rouletteTheme.shadows.gold,
  },
  chipHover: {
    borderColor: rouletteTheme.colors.cyan,
    shadowColor: rouletteTheme.colors.cyan,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  chipPressed: {
    transform: [{ scale: 0.96 }],
  },
  chipText: {
    color: rouletteTheme.colors.cyan,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.6,
  },
  chipTextPhone: {
    fontSize: 12,
  },
  chipTextSelected: {
    color: rouletteTheme.colors.warmGold,
  },
});
