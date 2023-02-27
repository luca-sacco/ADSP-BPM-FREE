#!/bin/sh
# Script per il lint e il commit in ambiente linux

# se non ci sono argomenti mando un messaggio di errore ed esco
# es. ./gitcommit.sh src/assets mocks

# if [ $# -eq 0 ]
#   then
#     echo "Devi committare almeno un file... tutti gli argomenti sono passati come argomenti del git commit prima del messaggio";
#     exit;
# fi

echo "Seleziona il tipo di commit************"
echo "  1)Feat"
echo "  2)Fix"
echo "  3)Refactor"
echo "  4)CI"
echo "  5)chore"
read TYPE

# se non seleziono un tipo di commit corretto mando un messaggio di errore ed esco
case $TYPE in
1) PREPEND="feat:" ;;
2) PREPEND="fix:" ;;
3) PREPEND="refactor:" ;;
4) PREPEND="ci:" ;;
5) PREPEND="chore:" ;;
*)
  echo "Inserisci un tipo di commit valido"
  exit
  ;;
esac

echo "Tipo di commit scelto: \"" $PREPEND "\""

read -p "Messaggio del commit: " MESSAGE

# se non inserico un messaggio di commit corretto mando un messaggio di errore ed esco
if test -z "$MESSAGE"; then
  echo "Il messaggio del commit non deve essere vuoto!!"
  exit
fi

echo $MESSAGE

echo git commit $@ -m \"$PREPEND $MESSAGE\"

read -p "Confermi il commit: [y,n]" CONFIRM

export HUSKY_SKIP_HOOKS=1

# se non confermo il commit mando un messaggio di errore ed esco
if [ "$CONFIRM" = "y" ]; then
  eval git add -A
  eval git commit $@ -m \"$PREPEND $MESSAGE\"
else
  echo "Commit abortito sarai piu' fortunato!!"
  exit
fi
