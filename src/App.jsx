Update my existing React home theater designer app.

Add the following features:

1. SCREEN SIZE VALIDATION:
- Prevent screen sizes that exceed room width or proper viewing distance
- If invalid:
  - Do not allow layout update
  - Show error message

2. SCREEN SIZE RECOMMENDATION:
- Based on:
  - room width
  - viewing distance
- Suggest a recommended range like:
  "Recommended screen size: 100\"–120\""

3. PROJECTOR PLACEMENT:
- Automatically place projector based on screen size
- Calculate approximate throw distance
- Display projector icon in correct position

4. RISER SYSTEM:
- If rows >= 2:
  - Automatically add riser behind first row
  - Calculate depth and basic height
  - Render visually behind seating

5. ACOUSTIC PANEL TOGGLE:
- Add toggle button ON/OFF
- When ON:
  - Show side wall panels
  - Show rear wall panels

6. SMART SPEAKER POSITIONING:
- Align speakers relative to seating position (not fixed percentages)
- Surrounds near first row
- Rears behind last row
- Heights aligned above seating

7. HARD VALIDATION RULES:
- If layout is invalid:
  - Block selection
  - Show message explaining what to fix

Do not remove my existing UI.
Enhance and improve current logic.

Keep design clean, premium, and dark-themed.
