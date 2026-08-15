<!-- Phase: Phase 16 collections -->
<!-- Document ID: wishlist -->
<!-- Version: 1 -->
<!-- Status: Active -->
<!-- Authority: Non-authoritative capture list for unreviewed ideas and reminders -->

# Wishlist

This file captures small ideas and reminders so they are not forgotten.

Every entry is unreviewed and remains undecided unless it passes the normal
design process and is explicitly accepted in its owning source-of-truth
document. An entry does not assign an implementation phase or authorize
implementation.

# List

## random

### Syntax

startValue = random()
startValue = random(100)
startValue = random(10, 100)

## Execute system calls

### Syntax

result << echo {{startValue }} // execute and capture result

<< echo {{ startValue }} | grep "whatever "
// just execute

## Print in colors

### Syntax

Add simple color methods to strings for terminal output, inspired by Ruby’s colorize style.
print("Success".green)
print("Error".red)
print("Status: " + "FAILED".red)
Color applies only to the styled string portion, allowing mixed colors within one printed line without special print syntax or manual ANSI escape codes.

print("Success".green)
print("Error".red)
print("Status: " + "FAILED".red)

## Postfix if

### Syntax

return "ok" if (value == true)
