import { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { rouletteTheme } from "../assets/theme";
import { RED_NUMBERS, RouletteBet, RouletteBetInput, getBetKey } from "../utils/payouts";

type RouletteBoardProps = {
  bets: RouletteBet[];
  disabled?: boolean;
  onPlaceBet: (bet: RouletteBetInput) => void;
};

const ROW_TOP = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
const ROW_MID = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
const ROW_LOW = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
const BOARD_ROWS = [ROW_TOP, ROW_MID, ROW_LOW];

const SPLITS: Array<[number, number]> = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [2, 3],
  [4, 5],
  [5, 6],
  [7, 8],
  [8, 9],
  [10, 11],
  [11, 12],
  [13, 14],
  [14, 15],
  [16, 17],
  [17, 18],
  [34, 35],
  [35, 36],
];

const CORNERS: Array<[number, number, number, number]> = [
  [1, 2, 4, 5],
  [2, 3, 5, 6],
  [4, 5, 7, 8],
  [5, 6, 8, 9],
  [7, 8, 10, 11],
  [8, 9, 11, 12],
  [10, 11, 13, 14],
  [11, 12, 14, 15],
  [13, 14, 16, 17],
  [14, 15, 17, 18],
  [25, 26, 28, 29],
  [26, 27, 29, 30],
  [28, 29, 31, 32],
  [29, 30, 32, 33],
  [31, 32, 34, 35],
  [32, 33, 35, 36],
];

function amountText(amount: number) {
  return amount > 0 ? String(amount) : "";
}

function NumberCell({
  number,
  amount,
  onPress,
  disabled,
}: {
  number: number;
  amount: number;
  onPress: () => void;
  disabled?: boolean;
}) {
  const isRed = RED_NUMBERS.indexOf(number) !== -1;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ hovered, pressed }: any) => [
        styles.numberCell,
        number === 0 ? styles.zeroCell : isRed ? styles.redCell : styles.blackCell,
        hovered && !disabled ? styles.glowHover : null,
        pressed && !disabled ? styles.cellPressed : null,
      ]}
    >
      <Text style={styles.numberText}>{number}</Text>
      {amount > 0 ? (
        <View style={styles.chipBadge}>
          <Text style={styles.chipBadgeText}>{amountText(amount)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function BetCell({
  label,
  amount,
  onPress,
  disabled,
  compact,
}: {
  label: string;
  amount: number;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ hovered, pressed }: any) => [
        compact ? styles.advancedCell : styles.betCell,
        hovered && !disabled ? styles.glowHover : null,
        pressed && !disabled ? styles.cellPressed : null,
      ]}
    >
      <Text style={compact ? styles.advancedLabel : styles.betLabel}>{label}</Text>
      <Text style={compact ? styles.advancedAmount : styles.betAmount}>{amountText(amount)}</Text>
    </Pressable>
  );
}

function RawRouletteBoard({ bets, disabled, onPlaceBet }: RouletteBoardProps) {
  const { width } = useWindowDimensions();
  const isPhone = width < 430;

  const amountByBet = useMemo(() => {
    const map: Record<string, number> = {};
    bets.forEach((bet) => {
      const key = getBetKey(bet);
      map[key] = (map[key] ?? 0) + bet.amount;
    });
    return map;
  }, [bets]);

  const getAmount = (bet: RouletteBetInput) => amountByBet[getBetKey(bet)] ?? 0;

  return (
    <View style={[styles.container, isPhone && styles.containerPhone]}>
      <Text style={styles.sectionTitle}>Table de mises</Text>

      <View style={[styles.mainBoard, isPhone && styles.mainBoardPhone]}>
        <View style={[styles.zeroColumn, isPhone && styles.zeroColumnPhone]}>
          <NumberCell
            number={0}
            amount={getAmount({ kind: "single", number: 0 })}
            onPress={() => onPlaceBet({ kind: "single", number: 0 })}
            disabled={disabled}
          />
        </View>

        <View style={[styles.gridArea, isPhone && styles.gridAreaPhone]}>
          {BOARD_ROWS.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={[styles.gridRow, isPhone && styles.gridRowPhone]}>
              {row.map((number) => (
                <NumberCell
                  key={number}
                  number={number}
                  amount={getAmount({ kind: "single", number })}
                  onPress={() => onPlaceBet({ kind: "single", number })}
                  disabled={disabled}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.outsideRows, isPhone && styles.outsideRowsPhone]}>
        <BetCell
          label="1-18"
          amount={getAmount({ kind: "evenChance", chanceType: "low" })}
          onPress={() => onPlaceBet({ kind: "evenChance", chanceType: "low" })}
          disabled={disabled}
        />
        <BetCell
          label="PAIR"
          amount={getAmount({ kind: "evenChance", chanceType: "even" })}
          onPress={() => onPlaceBet({ kind: "evenChance", chanceType: "even" })}
          disabled={disabled}
        />
        <BetCell
          label="ROUGE"
          amount={getAmount({ kind: "evenChance", chanceType: "red" })}
          onPress={() => onPlaceBet({ kind: "evenChance", chanceType: "red" })}
          disabled={disabled}
        />
        <BetCell
          label="NOIR"
          amount={getAmount({ kind: "evenChance", chanceType: "black" })}
          onPress={() => onPlaceBet({ kind: "evenChance", chanceType: "black" })}
          disabled={disabled}
        />
        <BetCell
          label="IMPAIR"
          amount={getAmount({ kind: "evenChance", chanceType: "odd" })}
          onPress={() => onPlaceBet({ kind: "evenChance", chanceType: "odd" })}
          disabled={disabled}
        />
        <BetCell
          label="19-36"
          amount={getAmount({ kind: "evenChance", chanceType: "high" })}
          onPress={() => onPlaceBet({ kind: "evenChance", chanceType: "high" })}
          disabled={disabled}
        />
      </View>

      <View style={[styles.outsideRows, isPhone && styles.outsideRowsPhone]}>
        <BetCell
          label="1ère 12"
          amount={getAmount({ kind: "dozen", dozen: 1 })}
          onPress={() => onPlaceBet({ kind: "dozen", dozen: 1 })}
          disabled={disabled}
        />
        <BetCell
          label="2ème 12"
          amount={getAmount({ kind: "dozen", dozen: 2 })}
          onPress={() => onPlaceBet({ kind: "dozen", dozen: 2 })}
          disabled={disabled}
        />
        <BetCell
          label="3ème 12"
          amount={getAmount({ kind: "dozen", dozen: 3 })}
          onPress={() => onPlaceBet({ kind: "dozen", dozen: 3 })}
          disabled={disabled}
        />
        <BetCell
          label="COL 1"
          amount={getAmount({ kind: "column", column: 1 })}
          onPress={() => onPlaceBet({ kind: "column", column: 1 })}
          disabled={disabled}
        />
        <BetCell
          label="COL 2"
          amount={getAmount({ kind: "column", column: 2 })}
          onPress={() => onPlaceBet({ kind: "column", column: 2 })}
          disabled={disabled}
        />
        <BetCell
          label="COL 3"
          amount={getAmount({ kind: "column", column: 3 })}
          onPress={() => onPlaceBet({ kind: "column", column: 3 })}
          disabled={disabled}
        />
      </View>

      <Text style={styles.advancedTitle}>Paris avancés</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.advancedRow, isPhone && styles.advancedRowPhone]}>
        {SPLITS.map((pair) => {
          const bet: RouletteBetInput = { kind: "split", numbers: pair };
          return (
            <BetCell
              key={`s-${pair.join("-")}`}
              label={`Cheval ${pair[0]}/${pair[1]}`}
              amount={getAmount(bet)}
              onPress={() => onPlaceBet(bet)}
              disabled={disabled}
              compact
            />
          );
        })}
        {CORNERS.map((group) => {
          const bet: RouletteBetInput = { kind: "corner", numbers: group };
          return (
            <BetCell
              key={`c-${group.join("-")}`}
              label={`Carré ${group.join("/")}`}
              amount={getAmount(bet)}
              onPress={() => onPlaceBet(bet)}
              disabled={disabled}
              compact
            />
          );
        })}
      </ScrollView>

      {disabled ? (
        <View style={styles.lockLayer}>
          <Text style={styles.lockText}>Rien ne va plus</Text>
        </View>
      ) : null}
    </View>
  );
}

export const RouletteBoard = memo(RawRouletteBoard);

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: rouletteTheme.colors.panelBorder,
    backgroundColor: rouletteTheme.colors.panel,
    borderRadius: rouletteTheme.radii.lg,
    padding: 10,
    gap: 8,
    position: "relative",
    overflow: "hidden",
  },
  containerPhone: {
    padding: 8,
    gap: 6,
  },
  sectionTitle: {
    color: rouletteTheme.colors.textPrimary,
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.7,
  },
  mainBoard: {
    flexDirection: "row",
    gap: 6,
  },
  mainBoardPhone: {
    gap: 4,
  },
  zeroColumn: {
    width: 46,
  },
  zeroColumnPhone: {
    width: 38,
  },
  gridArea: {
    flex: 1,
    gap: 6,
  },
  gridAreaPhone: {
    gap: 4,
  },
  gridRow: {
    flexDirection: "row",
    gap: 6,
  },
  gridRowPhone: {
    gap: 4,
  },
  numberCell: {
    flex: 1,
    minHeight: 42,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: rouletteTheme.colors.panelBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  zeroCell: {
    backgroundColor: "rgba(20, 132, 94, 0.45)",
    minHeight: 138,
  },
  redCell: {
    backgroundColor: "rgba(187, 44, 84, 0.38)",
  },
  blackCell: {
    backgroundColor: rouletteTheme.colors.backgroundAlt,
  },
  numberText: {
    color: rouletteTheme.colors.textPrimary,
    fontWeight: "900",
    fontSize: 12,
  },
  glowHover: {
    borderColor: rouletteTheme.colors.cyan,
    shadowColor: rouletteTheme.colors.cyan,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 7,
  },
  cellPressed: {
    transform: [{ scale: 0.98 }],
  },
  chipBadge: {
    position: "absolute",
    right: 3,
    bottom: 3,
    borderRadius: 10,
    backgroundColor: rouletteTheme.colors.warmGold,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  chipBadgeText: {
    color: "#1b1e28",
    fontSize: 10,
    fontWeight: "900",
  },
  outsideRows: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  outsideRowsPhone: {
    gap: 4,
  },
  betCell: {
    flex: 1,
    minWidth: 80,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: rouletteTheme.colors.panelBorder,
    backgroundColor: rouletteTheme.colors.backgroundAlt,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  betLabel: {
    color: rouletteTheme.colors.textPrimary,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  betAmount: {
    color: rouletteTheme.colors.warmGold,
    fontWeight: "900",
    fontSize: 11,
    marginTop: 1,
  },
  advancedTitle: {
    color: rouletteTheme.colors.textSecondary,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.7,
    marginTop: 2,
  },
  advancedRow: {
    gap: 6,
    paddingRight: 6,
  },
  advancedRowPhone: {
    gap: 4,
  },
  advancedCell: {
    width: 132,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: rouletteTheme.colors.panelBorder,
    backgroundColor: rouletteTheme.colors.backgroundAlt,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  advancedLabel: {
    color: rouletteTheme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 11,
  },
  advancedAmount: {
    color: rouletteTheme.colors.warmGold,
    fontWeight: "900",
    fontSize: 11,
    marginTop: 1,
  },
  lockLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4, 9, 20, 0.78)",
  },
  lockText: {
    color: rouletteTheme.colors.cyan,
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.7,
  },
});
