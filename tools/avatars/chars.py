"""Cast definitions: how each source model becomes an ASCENT avatar.

Keys used by build_char.py
    src        folder under raw/
    tex_map    {material part: texture part} when a slot borrows another slot's texture set
    delete     material parts whose faces are removed (weapons, capes, tails, FX shells)
    hair       tint / gain for the greyscale hair strands
    recolor    {texture part: [rules]} — HSV moves that keep the painted strokes (see tex.recolor)
    glass      material parts rendered as a see-through glare overlay
    anims      [(clip name, White Fox action name, options)]
    arm_out    degrees to open the arms (bulky bodies)
"""

# Brand palette (sRGB, 0..1) used by recolours
BURNT = 17.0   # burnt-orange hue in degrees
GREEN = 146.0
YELLOW = 48.0
RED = 356.0

NAVY_TO_CHARCOAL = dict(h=(190, 300), s=(0.16, 1.0), s_mul=0.10, v_mul=0.80, feather_h=14)
# very dark navy (trousers): neutralise, then lift so the painted folds still read on a black page
NAVY_TO_GRAPHITE = dict(h=(190, 300), s=(0.10, 1.0), s_mul=0.08, v_gamma=0.80, v_mul=1.22, feather_h=14)

CAST = {
    # Doctor Strange "Stephen Sanders": lab coat, scrubs, stethoscope, ID badge.
    # Already an education/healthcare identity — only moved onto the brand palette.
    "clinician": dict(
        src="doctor-strange-stephen-sanders",
        tex_map={"body": "equip05"},
        hair=dict(tint=(0.93, 0.94, 0.97), gain=1.45, ao=0.55),
        recolor={
            "equip03": [dict(NAVY_TO_CHARCOAL, v_mul=0.98, v_gamma=0.92),
                        dict(h=(338, 14), s=(0.45, 1.0), to_h=BURNT, s_mul=1.02, v_mul=1.12, feather_h=6)],
            "equip01": [NAVY_TO_GRAPHITE],
            "equip05": [dict(h=(205, 265), s=(0.30, 1.0), s_mul=0.10, v_mul=0.80, feather_h=8)],
        },
        glass=["equip06"],
        anims=[("idle", "Lobby_Stand_Idle", {}), ("flourish", "Lobby_Stand_Personality", {})],
    ),
    # Moon Knight "Suave Spector": white waistcoat over a bare chest and bare, bandaged arms; cape,
    # floating darts, batons, crescent brooch, ankh and chains. Everything that is costume or symbol
    # goes; chest and arms become a fitted charcoal shirt. Reads as a consultant in a three-piece.
    "strategist": dict(
        src="moon-knight-suave-spector",
        tex_map={"equip01": "body"},  # the arms are painted on the Body sheet
        delete=["crescentdarts", "cloak01", "cloak02", "cloak01crystal", "cloak02crystal", "battlestick", "equip02crystal01"],
        delete_islands=[dict(part="equip02", max_faces=300, x=(-0.25, 0.25), z=(0.85, 1.62))],
        fabric={"body": dict(target=0.15, contrast=0.24, n_flat=0.85, rough=0.86)},
        recolor={"equip02": [dict(h=(165, 250), s=(0.25, 1.0), s_mul=0.08, v_mul=0.95, feather_h=10)]},
        hair=dict(tint=(0.95, 0.95, 0.97), gain=1.35, ao=0.5),
        anims=[("idle", "Lobby_Stand_Idle", {})],
    ),
    # Psylocke "Fleeting Butterfly": cropped jacket over a bare midriff, two katanas on the back.
    # Blades go; all skin below the neck becomes a charcoal base layer; the chest is reduced; hot pink
    # moves to brand green.
    "analyst": dict(
        src="psylocke-fleeting-butterfly",
        delete=["weapon01", "weapon02"],
        soften=[dict(groups=r"^L_Breast", pivot="L_Breast_01_Jnt", amount=0.64),
                dict(groups=r"^R_Breast", pivot="R_Breast_01_Jnt", amount=0.64)],
        fabric={"body": dict(target=0.14, contrast=0.22, n_flat=0.9, rough=0.86)},
        recolor={
            "equip01": [dict(h=(285, 12), s=(0.22, 1.0), to_h=GREEN, s_mul=0.80, v_mul=0.84, feather_h=10)],
            "equip02": [dict(h=(285, 12), s=(0.22, 1.0), to_h=GREEN, s_mul=0.80, v_mul=0.84, feather_h=10)],
        },
        hair=dict(tint=(0.42, 0.40, 0.46), gain=1.0, ao=0.5),
        anims=[("idle", "Lobby_Stand_Idle", {})],
    ),
}
