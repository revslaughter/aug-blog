import Image from "next/image";
import styles from "./plantDivider.module.css";

// Every icon in public/plants/, pre-shuffled once so the arrangement is
// identical between server and client render — this site is a static
// export, so per-render randomness here would cause a hydration mismatch.
const SHUFFLED_PLANT_ICONS = [
	"sansevieria",
	"golden-pothos",
	"ficus-burgundy",
	"croton-petra",
	"philodendron-hope",
	"dracaena-lemon-lime",
	"nephthytis",
	"aloe",
	"dracaena-warneckii",
	"schefflera",
	"philodendron-monstera",
	"dracaena-magenta-tips",
	"variegated-spider-plant",
	"ficus-lyrata-bambino",
	"dracaena-green-stripe",
	"dracaena-janet-craig",
];

/**
 * A vine divider with a handful of plant icons scattered along it. `offset`
 * rotates which slice of the shuffled icon set is shown, so multiple
 * dividers on one page don't all repeat the same icons.
 *
 * @param {{count?: number, offset?: number, leaves?: boolean}} props
 */
export default function PlantDivider({
	count = 10,
	offset = 0,
	leaves = false,
}) {
	const icons = Array.from(
		{ length: count },
		(_, i) => SHUFFLED_PLANT_ICONS[(offset + i) % SHUFFLED_PLANT_ICONS.length],
	);

	function showLeaves(showLeaves) {
		if (showLeaves) {
			return (
				<div className={styles.icons} aria-hidden="true">
					{icons.map((name, i) => (
						<Image
							key={`${name}-${i}`}
							src={`/plants/${name}.svg`}
							width={20}
							height={20}
							alt=""
							className={i % 2 === 0 ? styles.iconUp : styles.iconDown}
						/>
					))}
				</div>
			);
		}
	}

	return (
		<div className={styles.plantDivider}>
			<span className="vine-divider" aria-hidden="true" />
			{showLeaves(leaves)}
		</div>
	);
}
