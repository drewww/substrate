LEVEL EDITOR
-----------

I want to have a level editor that allows me to create and edit levels. It should output JSON which can be processed into entities and components that can be loaded into the game.

The level editor should be a single page application. On the left, there is a Display object showing the current level. On the right is an entity editor. When you select a cell by left clicking it, the entity editor will show the entity that occupies that cell. Selecting an entity on the right shows a list of its components and properties on those components. Each component its own text area where you can edit its JSON directly. In the list of entities in the cell, sort by z-index and allow you to set the z-index of each entity. Each entity in the list should have a delete button that removes it, and a copy button that makes it the currently selected entity that can be placed elsewhere in the level.

On the left is a set of tools. At the start just a pointer and an "export" button. Later we might add:
 - drag select
 - wall tool
 - show FOV from point
 - etc.

The export button should output the current level as a JSON object. Download it as a .json file.

Below the display is a palette. It has two rows, with square buttons The top row is entities. These are pre-defined in code. Eventually we'll expose the entity palette setup in text.

Below that is a row of components. These are also pre-defined in code, later we'll expose configuration options in text. To start it should have: Opaque, Symbol, Followable, Following, Facing, Impassable. 

If you click an entity then click on a cell, add the entity to that cell. 

If you click a component and click on a cell, add the component to the top-most entity in that cell by z-index. Alternatively if you click on a cell, select an entity on the right side, and then click on a component in the palette -- add that component to the selected entity.

Internally, we probably keep a World object going that we place the actual entities into and use the basic Renderer. Special component rendering won't necessarily exist but symbol components should render. And maybe we'll have a special "editor" renderer that can render the entities in a different way later.


Answers
-------

 - No multi-selection to start.
 - Right click should be "place" an entity or component, left click is slect.
 - When copying an entity, copy all its components.
 - By default, place a new entity at the top of the z-index stack.
 - Yes, add quick buttons for bring to front / send to back in the entity layer list.
 - z-index can have gaps
 - Output should be a list of entities, each with a list of components. They should match the Entity and Component classes.




PROPOSED IMPLEMENTATION STEPS
-----------------------------


Step 1: Basic Editor Structure
Create /editor/editor.ts - main editor class
Create /editor/editor-display.ts - handles Display setup with grid
Create /editor/editor-state.ts - manages selection and tool states
Basic layout with Display on left, empty panel on right
Implement basic click handling on Display
Step 2: Entity Selection & Panel
Create /editor/entity-panel.ts - right side panel
Show entities in selected cell
Display z-index for each entity
Add delete buttons
Basic JSON view of components (read-only first)
Step 3: Entity Palette
Create /editor/palette/entity-palette.ts
Create /editor/palette/entity-definitions.ts - hardcoded entity templates
Implement palette row below Display
Handle entity selection from palette
Implement right-click to place selected entity
Step 4: Component Management
Create /editor/palette/component-palette.ts
Add component buttons (Opaque, Symbol, etc.)
Implement component addition to entities
Make component JSON editable
Add validation
Step 5: Z-Index & Entity Operations
Implement z-index sorting in entity list
Add bring to front/send to back buttons
Implement entity copying
Handle z-index when placing new entities
Step 6: Export
Add export button
Implement level serialization
Add file download functionality
